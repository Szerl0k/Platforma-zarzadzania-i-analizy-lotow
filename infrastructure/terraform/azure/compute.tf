# DATABASE VM
resource "azurerm_linux_virtual_machine" "vm" {
  name                            = var.vm_name
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_resource_group.rg.location
  size                            = var.vm_size
  admin_username                  = var.admin_username
  disable_password_authentication = true
  network_interface_ids           = [azurerm_network_interface.postgis-nic.id]
  zone                            = "1"

  custom_data = base64encode(templatefile(
    "${path.module}/${var.postgis_provisioning_script_path}",
    {
      db_password = var.db_password
    }
  ))


  #filebase64("${path.module}/${var.postgis_provisioning_script_path}")

  admin_ssh_key {
    username   = var.admin_username
    public_key = var.ssh_public_key
  }

  os_disk {
    caching              = "ReadWrite"
    storage_account_type = "Premium_LRS"
  }

  source_image_reference {
    publisher = "canonical"
    offer     = "ubuntu-24_04-lts"
    sku       = "server"
    version   = "latest"
  }

  identity {
    type = "SystemAssigned"
  }
}

# THIS IS UNAVAILABLE IN CENTRAL POLAND
# resource "azurerm_dev_test_global_vm_shutdown_schedule" "shutdown" {
#   virtual_machine_id    = azurerm_linux_virtual_machine.vm.id
#   location              = azurerm_resource_group.rg.location
#   enabled               = true
#   daily_recurrence_time = "0200"
#   timezone              = "Central European Standard Time"

#   notification_settings {
#     enabled         = true
#     time_in_minutes = 30
#     email           = var.alert_email
#   }
# }

resource "azurerm_managed_disk" "poc_data_disk" {
  count                = var.use_existing_data ? 0 : 1
  name                 = "${var.vm_name}-poc-data-disk"
  location             = azurerm_resource_group.rg.location
  resource_group_name  = azurerm_resource_group.rg.name
  storage_account_type = "Premium_LRS"
  create_option        = "Empty"
  disk_size_gb         = 32
}

resource "azurerm_virtual_machine_data_disk_attachment" "data_disk_attach" {
  managed_disk_id    = var.use_existing_data ? data.azurerm_managed_disk.postgis-data[0].id : azurerm_managed_disk.poc_data_disk[0].id
  virtual_machine_id = azurerm_linux_virtual_machine.vm.id
  lun                = 0
  caching            = "ReadOnly"
}


# WEB APPS
resource "azurerm_service_plan" "app_plan" {
  name                = var.app_plan_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = var.app_service_plan_sku
}

# BACKEND
resource "azurerm_linux_web_app" "backend" {
  location            = azurerm_resource_group.rg.location
  name                = var.backend_app_name
  resource_group_name = azurerm_resource_group.rg.name
  service_plan_id     = azurerm_service_plan.app_plan.id

  virtual_network_subnet_id = azurerm_subnet.app_service_subnet.id

  site_config {
    application_stack {

      # Initial placeholder
      docker_image_name   = "nginx:alpine"
      docker_registry_url = "https://index.docker.io/v1/"
    }

    vnet_route_all_enabled = true

  }

  app_settings = {
    # Prevents the container from attempting to map the default Azure file share
    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = "false"

    "WEBSITES_PORT" = "5000"

    # Expose internal db IP to the container app
    "NODE_ENV" = "production"
    "DB_PORT"  = "5432"
    "DB_USER"  = "postgres"
    "DB_NAME"  = "flight_db"
    "DB_HOST"  = azurerm_network_interface.postgis-nic.private_ip_address

    # "DOCKER_REGISTRY_SERVER_URL" = "https://index.docker.io/v1/"
  }

  lifecycle {
    ignore_changes = [
      site_config.0.application_stack,
      app_settings["DB_PASSWORD"],
      app_settings["JWT_SECRET"],
      app_settings["AEROAPI_KEY"],
      app_settings["OPENSKY_CLIENT_ID"],
      app_settings["OPENSKY_CLIENT_SECRET"]
    ]
  }
}

# FRONTEND
# Due to region limitations for Azure for Students account, we can't deploy
# an Azure Static Web Apps resource.

resource "azurerm_linux_web_app" "frontend" {
  location            = azurerm_resource_group.rg.location
  name                = var.frontend_app_name
  resource_group_name = azurerm_resource_group.rg.name

  service_plan_id = azurerm_service_plan.app_plan.id

  site_config {
    application_stack {
      docker_image_name   = "nginx:alpine"
      docker_registry_url = "https://index.docker.io/v1/"
    }
  }

  app_settings = {
    # Injects the backend URL into Next.js container at runtime for the proxy
    "INTERNAL_API_URL" = "https://${azurerm_linux_web_app.backend.default_hostname}"
    "WEBSITES_PORT"    = "3000"

    # "DOCKER_REGISTRY_SERVER_URL" = "https://index.docker.io/v1/"
  }

  lifecycle {
    ignore_changes = [
      site_config.0.application_stack
    ]
  }
}

resource "azurerm_monitor_autoscale_setting" "backend_autoscale" {
  count               = var.enable_autoscaling ? 1 : 0
  name                = "backend-autoscale-setting"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  target_resource_id  = azurerm_service_plan.app_plan.id

  profile {
    name = "CpuAutoscaleProfile"

    capacity {
      default = 1
      minimum = 1
      maximum = 5
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.app_plan.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT3M" 
        time_aggregation   = "Average"
        operator           = "GreaterThan"
        threshold          = 70 
      }
      scale_action {
        direction = "Increase"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }

    rule {
      metric_trigger {
        metric_name        = "CpuPercentage"
        metric_resource_id = azurerm_service_plan.app_plan.id
        time_grain         = "PT1M"
        statistic          = "Average"
        time_window        = "PT5M"
        time_aggregation   = "Average"
        operator           = "LessThan"
        threshold          = 30
      }
      scale_action {
        direction = "Decrease"
        type      = "ChangeCount"
        value     = "1"
        cooldown  = "PT5M"
      }
    }
  }
}
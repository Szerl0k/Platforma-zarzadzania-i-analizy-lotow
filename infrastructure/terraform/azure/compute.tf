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

  custom_data = filebase64("${path.module}/${var.postgis_provisioning_script_path}")

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

resource "azurerm_virtual_machine_data_disk_attachment" "data_disk_attach" {
  managed_disk_id    = data.azurerm_managed_disk.postgis-data.id
  virtual_machine_id = azurerm_linux_virtual_machine.vm.id
  lun                = 0
  caching            = "ReadOnly"
}


# WEB APPS
resource "azurerm_service_plan" "app_plan" {
  name                = "dev-inz-app-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = "B1"
}

# BACKEND
resource "azurerm_linux_web_app" "backend" {
  location            = azurerm_resource_group.rg.location
  name                = "dev-inz-backend-api"
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

    # Expose internal db IP to the container app
    "DB_HOST" = azurerm_network_interface.postgis-nic.private_ip_address

    "DOCKER_REGISTRY_SERVER_URL" = "https://index.docker.io/v1/"
  }

}

# FRONTEND
# Due to region limitations for Azure for Students account, we can't deploy
# an Azure Static Web Apps resource.

resource "azurerm_linux_web_app" "frontend" {
  location            = azurerm_resource_group.rg.location
  name                = "dev-inz-frontend-app"
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

    "DOCKER_REGISTRY_SERVER_URL" = "https://index.docker.io/v1/"
  }

}
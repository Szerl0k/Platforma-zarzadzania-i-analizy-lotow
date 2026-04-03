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
    public_key = file(var.ssh_public_key_path)
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
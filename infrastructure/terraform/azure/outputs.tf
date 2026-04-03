output "resource_group_name" {
  description = "The name of rg hosting the db information"
  value       = azurerm_resource_group.rg.name
}

output "vm_name" {
  description = "The hostname of the postgres vm"
  value       = azurerm_linux_virtual_machine.vm.name
}

output "database_public_ip" {
  description = "The public IP address of the postgres vm"
  value       = azurerm_public_ip.pip.ip_address
}

output "database_private_ip" {
  description = "The private IP address of the postgres vm"
  value       = azurerm_network_interface.postgis-nic.private_ip_address
}
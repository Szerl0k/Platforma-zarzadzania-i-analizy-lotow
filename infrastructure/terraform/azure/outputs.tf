output "resource_group_name" {
  description = "The name of rg hosting the db information"
  value       = azurerm_resource_group.rg.name
}

output "vm_name" {
  description = "The hostname of the postgres vm"
  value       = azurerm_linux_virtual_machine.vm.name
}

output "database_fqdn" {
  description = "The FQDN of the postgres vm"
  value       = azurerm_public_ip.pip.fqdn
}

output "database_private_ip" {
  description = "The private IP address of the postgres vm"
  value       = azurerm_network_interface.postgis-nic.private_ip_address
}

output "frontend_url" {
  description = "The default hostname of the frontend App Service"
  value       = azurerm_linux_web_app.frontend.default_hostname
}

output "backend_url" {
  description = "The default hostname of the backend App Service"
  value       = azurerm_linux_web_app.backend.default_hostname
}

output "nat_gateway_public_ip" {
  description = "The static outbound IP address used by the backend App Service"
  value       = azurerm_public_ip.nat_pip.ip_address
}


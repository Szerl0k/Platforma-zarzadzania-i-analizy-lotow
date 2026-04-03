resource "azurerm_resource_group" "rg" {
  location = var.location
  name     = var.resource_group_name
  tags = {
    Owner       = "Mikolaj"
    Project     = "Praca inzynierska"
    Environment = "Dev"
  }
}
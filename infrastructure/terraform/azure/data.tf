data "azurerm_managed_disk" "postgis-data" {
  name                = var.data_disk_name
  resource_group_name = var.data_resource_group
}

data "azurerm_public_ip" "nat_pip" {
  name                = var.data_nat_pip
  resource_group_name = var.data_resource_group
}

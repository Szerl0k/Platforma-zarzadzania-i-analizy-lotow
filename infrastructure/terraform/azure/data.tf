data "azurerm_managed_disk" "postgis-data" {
  count               = var.use_existing_data ? 1 : 0
  name                = var.data_disk_name
  resource_group_name = var.data_resource_group
}

data "azurerm_public_ip" "nat_pip" {
  count               = var.use_existing_data ? 1 : 0
  name                = var.data_nat_pip
  resource_group_name = var.data_resource_group
}

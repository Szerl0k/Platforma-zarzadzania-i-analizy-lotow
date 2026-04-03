variable "location" {
  type        = string
  description = "Azure region for deployments"
  default     = "polandcentral"
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group"
  default     = "dev-inz-rg"
}

variable "vnet_address_space" {
  type        = list(string)
  description = "Address space for the virtual network"
  default     = ["10.1.0.0/16"]
}

variable "subnet_address_prefix" {
  type        = list(string)
  description = "Address prefix for the subnet"
  default     = ["10.1.0.0/24"]
}

variable "vm_name" {
  type        = string
  description = "Name of the virtual machine"
  default     = "dev-inz-postgis-vm"
}

variable "vm_size" {
  type        = string
  description = "Size of the virtual machine"
  default     = "Standard_D2as_v4"
}

variable "admin_username" {
  type        = string
  description = "Username for the virtual machine"
  default     = "azureuser"
}

variable "ssh_public_key_path" {
  type        = string
  description = "Path to the SSH public key"
  default     = "./ssh/dev-inz-postgis-key.pub"
}

variable "data_resource_group" {
  type        = string
  description = "Name of the data resource group"
  default     = "dev-data-rg"
}

variable "data_disk_name" {
  type        = string
  description = "Name of the existing managed disk to attach"
  default     = "inz-data-disk-postgis-01"
}

variable "alert_email" {
  type        = string
  description = "Email for shutdown notifications"
  default     = "mmiikkoojj@gmail.com"
}

variable "postgis_provisioning_script_path" {
  type        = string
  description = "Path to the PostGIS provisioning script"
  default     = "./scripts/postgis-provisioning-ubuntu.sh"
}
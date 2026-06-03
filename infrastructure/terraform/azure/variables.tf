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

variable "data_subnet_address_prefix" {
  type        = list(string)
  description = "Address prefix for the subnet"
  default     = ["10.1.0.0/24"]
}

variable "app_service_subnet_address_prefix" {
  type        = list(string)
  description = "Address prefix for the subnet"
  default     = ["10.1.1.0/24"]
}

variable "vm_name" {
  type        = string
  description = "Name of the virtual machine"
  default     = "dev-inz-postgis-vm"
}

variable "vm_size" {
  type        = string
  description = "Size of the virtual machine"
  default     = "Standard_B2ats_v2"
}

variable "admin_username" {
  type        = string
  description = "Username for the virtual machine"
  default     = "azureuser"
}

variable "db_password" {
  description = "The password for postgres user"
  type        = string
  sensitive   = true
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
  default     = "inz-data-disk-postgis-02"
}

variable "data_nat_pip" {
  type        = string
  description = "Name of the existing public ip to attach to NAT gateway"
  default     = "dev-inz-data-nat-pip"
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

variable "ssh_public_key" {
  type        = string
  description = "The raw SSH public key string for the VM"
  default     = "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQDIHH2UZrqGrLmGndgtzrAvSFPPIFswh1k4/8xd0ygjsOzlejzwPkkV3Bgc9/l1aG6dWuCguFxWB6Ysh+7y3gTFt3IxhpFgfas8jxuUuVd/6OX6EfKzu4Qmei1ufc451XwCCS5ECZ2N221Oo8SN5UW3Ae1LCTxqOFMYDNSZCgeWIP+c0MkOwF8CqrSsMjOKvqGFVYthsQurtU9agBzyLVWriXD2oobohv95a/b95Q98hyxZfsR1uV+aed6ZyJzbMFwzljXUlmi9niiuVEJtFcV+L6kMQUOw7xGCP4vxRnjonxRqyQVpYWeF5Slwvfzv6SNq2SOuTxBmZFSJsQ7PmEEQNQqTVL4sv2ftRegMCeic5zoG+gG/REotpzSXnjXm3sRxhAg3vbC6AIVOicliOztUa9FbfAuSpWFGgg0OUKNdQaEQdISUJPVssDOf5JVUwpZZVYkVQ5rIrSjFh4DxQJUCaD7NpbWXHWevozMVU8qCHbbZ4CIitCzvy7rets+ianU= mmiik@DESKTOP-MJ"
}

variable "app_service_plan_sku" {
  type        = string
  description = "The SKU for the App Service Plan"
  default     = "B1"
}

variable "enable_autoscaling" {
  type        = bool
  description = "Determine whether to deploy autoscale settings"
  default     = false
}

variable "app_plan_name" {
  type        = string
  description = "Name of the App Service Plan"
  default     = "dev-inz-app-plan"
}

variable "backend_app_name" {
  type        = string
  description = "Name of the backend App Service"
  default     = "dev-inz-backend-api"
}

variable "frontend_app_name" {
  type        = string
  description = "Name of the frontend App Service"
  default     = "dev-inz-frontend-app"
}

variable "data_subnet_name" {
  type        = string
  description = "Name of the data subnet"
  default     = "dev-inz-data-subnet"
}

variable "app_service_subnet_name" {
  type        = string
  description = "Name of the app service subnet"
  default     = "dev-inz-app-service-subnet"
}

variable "nat_gateway_name" {
  type        = string
  description = "Name of the NAT gateway"
  default     = "dev-inz-nat-gateway"
}

variable "public_ip_domain_name_label" {
  type        = string
  description = "Domain name label for the public IP"
  default     = "dev-inz-pzal-postgis"
}

variable "use_existing_data" {
  type        = bool
  description = "Toggle to use existing data sources vs provisioning ephemeral resources"
  default     = true
}


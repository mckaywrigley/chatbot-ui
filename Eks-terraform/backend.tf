terraform {
  backend "s3" {
    bucket = "satishjagana-cyient"
    key    = "EKS/terraform.tfstate"
    region = "us-east-1"
  }
}

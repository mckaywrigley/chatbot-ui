output "vpc_id" {
  value = data.aws_vpc.default.id
}

output "public_subnets" {
  value = data.aws_subnets.public.ids
}

# Define IAM role for EKS cluster
data "aws_iam_policy_document" "assume_role" {
  source_json = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "eks.amazonaws.com"
      }
    }
  ]
}
EOF
}

resource "aws_iam_role" "eks_cluster" {
  name               = "eks-cluster-cloud"
  assume_role_policy = data.aws_iam_policy_document.assume_role.json
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::326071639025:role/chatbot"
  role       = aws_iam_role.eks_cluster.name
}

# Define IAM role and policies for EKS node group
resource "aws_iam_role" "eks_node_group" {
  name = "eks-node-group-cloud"

  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = "sts:AssumeRole",
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_node_group_policies" {
  for_each = {
    "AmazonEKSWorkerNodePolicy"                 = "AmazonEKSWorkerNodePolicy",
    "AmazonEKS_CNI_Policy"                      = "AmazonEKS_CNI_Policy",
    "AmazonEC2ContainerRegistryReadOnly"       = "AmazonEC2ContainerRegistryReadOnly",
  }

  policy_arn = "arn:aws:iam::aws:policy/${each.value}"
  role       = aws_iam_role.eks_node_group.name
}

# Define VPC and subnets
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "public" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

# Provision EKS cluster
resource "aws_eks_cluster" "example" {
  name     = "EKS_CLOUD"
  role_arn = aws_iam_role.eks_cluster.arn

  vpc_config {
    subnet_ids = data.aws_subnets.public.ids
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy,
  ]
}

# Provision EKS node group
resource "aws_eks_node_group" "example" {
  cluster_name    = aws_eks_cluster.example.name
  node_group_name = "Node-cloud"
  node_role_arn   = aws_iam_role.eks_node_group.arn
  subnet_ids      = data.aws_subnets.public.ids

  scaling_config {
    desired_size = 1
    max_size     = 2
    min_size     = 1
  }
  instance_types = ["t2.medium"]

  depends_on = [
    aws_iam_role_policy_attachment.eks_node_group_policies,
  ]
}

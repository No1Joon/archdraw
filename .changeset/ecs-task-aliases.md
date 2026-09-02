---
'@archdraw/icons-aws': patch
---

Alias the ECS icons whose slug spells the service out — `ecs-task`, `ecs-service`, `ecs-container`. None of `amazon-elastic-container-service-task`, `-service` or `-container-1` contains the substring `ecs`, so `archdraw types ecs` never showed them and a diagram drew the ECS service mark on every task inside an ECS group.

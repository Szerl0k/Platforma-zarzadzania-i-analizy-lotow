import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from "typeorm";
import { RolePermission } from "./RolePermission";
import { BaseEntity } from "../../common/database/BaseEntity";

@Entity("roles")
export class Role extends BaseEntity {
  @PrimaryGeneratedColumn("increment")
  id!: number;

  @Column({ type: "varchar", length: 50, unique: true })
  name!: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  description!: string | null;

  @Column({ type: "boolean", name: "is_system" })
  isSystem!: boolean;

  @OneToMany(() => RolePermission, (rp) => rp.role)
  rolePermissions!: RolePermission[];
}

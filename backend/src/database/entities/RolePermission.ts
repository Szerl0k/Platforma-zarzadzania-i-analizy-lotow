import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Role } from './Role';
import { Permission } from './Permission';

@Entity('role_permissions')
export class RolePermission {
    @PrimaryColumn({ type: 'int', name: 'role_id' })
    roleId!: number;

    @PrimaryColumn({ type: 'int', name: 'permission_id' })
    permissionId!: number;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role!: Role;

    @ManyToOne(() => Permission)
    @JoinColumn({ name: 'permission_id' })
    permission!: Permission;

    @Column({ type: 'timestamp', precision: 0, name: 'granted_at' })
    grantedAt!: Date;
}

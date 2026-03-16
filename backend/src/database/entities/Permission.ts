import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './RolePermission';

@Entity('permissions')
export class Permission {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 100, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 100 })
    resource!: string;

    @Column({ type: 'varchar', length: 50 })
    action!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @OneToMany(() => RolePermission, rp => rp.permission)
    rolePermissions!: RolePermission[];
}

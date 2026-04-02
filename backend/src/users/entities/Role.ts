import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { RolePermission } from './RolePermission';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn('increment')
    id!: number;

    @Column({ type: 'varchar', length: 50, unique: true })
    name!: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    description!: string | null;

    @Column({ type: 'boolean', name: 'is_system' })
    isSystem!: boolean;

    @Column({ type: 'timestamp', precision: 0, name: 'created_at' })
    createdAt!: Date;

    @OneToMany(() => RolePermission, rp => rp.role)
    rolePermissions!: RolePermission[];
}

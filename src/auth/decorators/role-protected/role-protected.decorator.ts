import { SetMetadata } from '@nestjs/common';
import { ValidRoles } from 'src/auth/interfaces/valid-roles';

export const META_ROLES = 'roles'

export const RoleProtected = (...args: ValidRoles[]) => SetMetadata('roles', args);

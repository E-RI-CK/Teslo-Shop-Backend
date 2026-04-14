import { BadRequestException, Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  private readonly logger = new Logger('AuthService');

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService
  ) { }

  async create(createUserDto: CreateUserDto) {

    try {

      const { password: passwordToHash, ...userData } = createUserDto;

      const user = this.userRepository.create({ ...userData, password: bcrypt.hashSync(passwordToHash, 10) });

      await this.userRepository.save(user);

      const { password, isActive, ...userDataToReturn } = user;

      return {
        ...userDataToReturn,
        token: this.getJwtToken({ id: user.id })
      };

      //TODO: Return JWT of access

    } catch (error) {
      this.handleDBException(error);
    }

  }

  async login(loginUserDto: LoginUserDto) {

    const { email, password } = loginUserDto;

    const user = await this.userRepository.findOne({ where: { email }, select: { email: true, password: true, id: true } });

    if (!user) throw new UnauthorizedException(`Don't exist an account with this email`)

    if (!bcrypt.compareSync(password, user.password)) throw new UnauthorizedException(`Password Incorrect`);

    return {
      email: user.email,
      token: this.getJwtToken({ id: user.id })
    };

    //TODO: Return JWT of access

  }

  async checkAuthStatus(user: User) {

    const updatedToken = this.getJwtToken({ id: user.id });

    return {
      ...user,
      token: updatedToken
    }
  }

  private getJwtToken(payload: JwtPayload) {
    return this.jwtService.sign(payload);
  }

  private handleDBException(error: any) {

    if (error.code === '23505') throw new BadRequestException(error.detail);


    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }
}

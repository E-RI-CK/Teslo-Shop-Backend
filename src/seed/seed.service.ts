import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';
import { User } from 'src/auth/entities/user.entity';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import bcrypt from 'bcrypt';


@Injectable()
export class SeedService {

  constructor(
    private readonly productsService: ProductsService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) { }

  async runSeed() {
    await this.deleteTables()
    const adminUser = await this.insertUsers();
    await this.insertNewProducts(adminUser);
    return 'SEED EXECUTED';
  }

  private async deleteTables() {
    await this.productsService.deleteAllProducts();
    const queryBuilder = this.userRepository.createQueryBuilder();
    await queryBuilder
      .delete()
      .where({})
      .execute()

  }

  private async insertUsers() {
    const seedUsers = initialData.users;

    const users: User[] = [];

    seedUsers.forEach(user => {
      const { password, ...res } = user;
      const encryptedPassword = bcrypt.hashSync(password, 10);
      const parsedUser = { ...res, password: encryptedPassword };
      users.push(this.userRepository.create(parsedUser));
    })

    await this.userRepository.save(users);

    return users[0];
  }

  private async insertNewProducts(user: User) {
    const insertNewProductsPromise: Promise<any>[] = [];

    initialData.products.forEach((product) => {
      insertNewProductsPromise.push(this.productsService.create(product, user));
    });

    await Promise.all(insertNewProductsPromise);
  }

}

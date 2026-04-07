import { Injectable } from '@nestjs/common';
import { ProductsService } from 'src/products/products.service';
import { initialData } from './data/seed-data';


@Injectable()
export class SeedService {

  constructor(
    private readonly productsService: ProductsService
  ) { }

  async runSeed() {
    await this.insertNewProducts();
    return 'SEED EXECUTED';
  }

  private async insertNewProducts() {
    await this.productsService.deleteAllProducts();
    const insertNewProductsPromise: Promise<any>[] = [];

    initialData.products.forEach((product) => {
      insertNewProductsPromise.push(this.productsService.create(product));
    });

    await Promise.all(insertNewProductsPromise);
  }

}

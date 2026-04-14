import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { isUUID } from 'class-validator';
import { ProductImage } from './entities/product-image.entity';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {

  private readonly logger = new Logger('ProductService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,

    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,

    private readonly dataSource: DataSource
  ) { }

  async create(createProductDto: CreateProductDto, user: User) {

    try {
      const { images = [], ...restCreateProductProps } = createProductDto;
      const product = this.productRepository.create({
        ...restCreateProductProps,
        images: images.map((url) => this.productImageRepository.create({ url })),
        user
      });
      await this.productRepository.save(product);

      return {
        ...product,
        images
      };

    } catch (error) {
      this.handleDBException(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    return await this.productRepository.find({
      take: limit,
      skip: offset,
      relations: {
        images: true
      }
    });
  }

  async findOne(term: string) {

    const query = this.productRepository.createQueryBuilder('product');

    if (isUUID(term)) {
      query.where('product.id=:term', { term }).leftJoinAndSelect('product.images', 'productImage')
    } else {
      query.where('product.slug = :slug or UPPER(product.title) = :title', {
        slug: term.toLowerCase(),
        title: term.toUpperCase()
      }).leftJoinAndSelect('product.images', 'productImage')
    }

    const product = await query.getOne();

    if (!product) throw new NotFoundException(`Product with term ${term} not found`);
    return product;
  }


  async remove(id: string) {

    const result = await this.productRepository.delete({ id });

    if (result.affected === 0) throw new NotFoundException(`Product with id: ${id} not found`);

    return {
      message: "Product deleted"
    }
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {

    const { images, ...restUpdateProductProps } = updateProductDto;
    const product = await this.productRepository.preload({
      id,
      ...restUpdateProductProps,
    });

    if (!product) throw new NotFoundException(`Product with id: ${id} not found`);

    //Create query runner

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();



    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
        product.images = images.map((url) => this.productImageRepository.create({ url }));
        product.user = user;
      }

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();
      //await this.productRepository.save(product);
      return this.findOnePlain(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleDBException(error);
    }
  }

  private async findOnePlain(term: string) {
    const { images = [], ...rest } = await this.findOne(term);

    return {
      rest,
      images: images.map((image) => (image.url))
    }

  }

  private handleDBException(error: any) {

    if (error.code === '23505') throw new BadRequestException(error.detail);
    if (error.code === '22P02') throw new BadRequestException(`invalid input syntax for type uuid: ${error.id}`);

    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');

  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      await query
        .delete()
        .where({})
        .execute()
    } catch (error) {
      this.handleDBException(error)
    }
  }

}

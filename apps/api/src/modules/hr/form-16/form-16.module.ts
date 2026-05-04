import { Module } from '@nestjs/common';
import { Form16Controller } from './form-16.controller.js';
import { Form16Service } from './form-16.service.js';

@Module({
  controllers: [Form16Controller],
  providers: [Form16Service],
  exports: [Form16Service],
})
export class Form16Module {}

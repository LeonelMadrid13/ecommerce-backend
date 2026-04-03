import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiExcludeController()
@Controller()
export class AppController {
  @Get()
  redirectToDocs(@Res() res: Response) {
    return res.redirect('/docs');
  }
}

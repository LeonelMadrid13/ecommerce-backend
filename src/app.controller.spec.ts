import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
import type { Response } from 'express';

import { AppController } from './app.controller.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should redirect to /docs', () => {
      const redirectMock = jest.fn();
      const res = {
        redirect: redirectMock,
      } as unknown as Response;

      appController.redirectToDocs(res);

      expect(redirectMock).toHaveBeenCalledWith('/docs');
    });
  });
});

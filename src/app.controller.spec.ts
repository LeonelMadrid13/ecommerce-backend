import { Test, TestingModule } from '@nestjs/testing';
import { jest } from '@jest/globals';
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
      const res = {
        redirect: jest.fn(),
      } as any;

      appController.redirectToDocs(res);

      expect(res.redirect).toHaveBeenCalledWith('/docs');
    });
  });
});

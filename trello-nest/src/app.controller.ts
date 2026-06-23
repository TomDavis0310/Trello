import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './common/guards/auth.guard';
import { CurrentUser } from './common/decorators/current-user.decorator';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @UseGuards(AuthGuard)
  @Get('data')
  getData(@CurrentUser() user: any) {
    return this.appService.getFullData(user.sub);
  }
}

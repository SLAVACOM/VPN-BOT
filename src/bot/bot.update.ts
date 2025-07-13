import { Start, Help, Update, On, Message } from 'nestjs-telegraf';
import { Context } from 'telegraf';

@Update()
export class BotUpdate {
  @Start()
  async onStart(ctx: Context) {
    await ctx.reply('👋 Привет! Я бот на NestJS.');
  }

  @Help()
  async onHelp(ctx: Context) {
    await ctx.reply('ℹ️ Команды:\n/start — начать\n/help — помощь');
  }

  @On('text')
  async onText(@Message('text') text: string, ctx: Context) {
    await ctx.reply(`Вы написали: ${text}`);
  }
}

import { BotFrameworkAdapter, ConsoleTranscriptLogger, TranscriptLoggerMiddleware, TurnContext } from 'botbuilder';
import { config } from 'dotenv';
import * as express from 'express';

config({ path: `${__dirname}/../.env` });

const logger = new TranscriptLoggerMiddleware(new ConsoleTranscriptLogger());
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  })
  .use(logger);
const port = process.env.PORT || 3978;

express()
  .post('/api/messages', (req, res, next) => adapter.processActivity(req, res, async (context: TurnContext) => {
    await context.sendActivity('hello world');
  }).catch(next))
  .listen(port, () => console.log(`Listening on ${port}`));

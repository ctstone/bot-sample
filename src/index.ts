import { TelemetryClient } from 'applicationinsights';
import { ActivityTypes, BotFrameworkAdapter, ConsoleTranscriptLogger, ConversationState, MemoryStorage, TranscriptLoggerMiddleware, TurnContext } from 'botbuilder';
import { Feedback } from 'botbuilder-feedback';
import { AppInsightsTranscriptStore } from 'botbuilder-transcript-app-insights';
import { CosmosDbTranscriptStore } from 'botbuilder-transcript-cosmosdb';
import { DocumentClient } from 'documentdb';
import { config } from 'dotenv';
import * as express from 'express';

config({ path: `${__dirname}/../.env` });

const appInsights = new TelemetryClient(process.env.APP_INSIGHTS_IKEY);
const documentdb = new DocumentClient(process.env.DOCUMENTDB_URL, { masterKey: process.env.DOCUMENTDB_KEY });
const logstore =
  // new CosmosDbTranscriptStore(documentdb)
  new ConsoleTranscriptLogger()
  // new AppInsightsTranscriptStore(appInsights, {
  //   applicationId: process.env.APP_INSIGHTS_APP_ID,
  //   readKey: process.env.APP_INSIGHTS_API_KEY,
  // })
  ;

const conversationState = new ConversationState(new MemoryStorage());
const feedback = new Feedback({ conversationState });
const logger = new TranscriptLoggerMiddleware(logstore);
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  })
  .use(conversationState, feedback, logger);
const port = process.env.PORT || 3978;
express()
  .post('/api/messages', (req, res, next) => adapter.processActivity(req, res, async (context: TurnContext) => {
    switch (context.activity.type) {
      case ActivityTypes.ConversationUpdate:
        await context.sendActivity(`Welcome, ${context.activity.membersAdded.map((x) => x.name).join(', ')}`);
        break;

      case ActivityTypes.Message:
        if (context.activity.text === 'what?') {
          const message = Feedback.requestFeedback(context, 'the answer is FOO');
          await context.sendActivity(message);
        } else {
          await context.sendActivity(`You said '${context.activity.text}`);
        }
        break;
    }
  }).catch(next))
  .listen(port, () => console.log(`Listening on ${port}`));

// logstore.listTranscripts('emulator')
//   .then(console.log)
//   .catch(console.error);

// logstore.getTranscriptActivities('emulator', '862madb9633a')
//   .then(console.log)
//   .catch(console.error);

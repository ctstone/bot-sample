import { TelemetryClient } from 'applicationinsights';
import {
  ActivityTypes, AutoSaveStateMiddleware, BotFrameworkAdapter,
  ConsoleTranscriptLogger, ConversationState, MemoryStorage,
  TranscriptLoggerMiddleware, TurnContext } from 'botbuilder';
import { LuisRecognizer } from 'botbuilder-ai';
import { Feedback } from 'botbuilder-feedback';
import { HttpTestRecorder } from 'botbuilder-http-test-recorder';
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

const luis = new LuisRecognizer({
  applicationId: process.env.LUIS_APP_ID,
  endpointKey: process.env.LUIS_KEY,
  endpoint: process.env.LUIS_ENDPOINT, // e.g: https://westus.api.cognitive.microsoft.com
});
const testRecorder = new HttpTestRecorder()
  .captureLuis()
  .captureAzureSearch();
const conversationState = new ConversationState(new MemoryStorage());
const autoSaveState = new AutoSaveStateMiddleware(conversationState);
const feedback = new Feedback(conversationState, {
  feedbackActions: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
  promptFreeForm: ['3'],
});
const logger = new TranscriptLoggerMiddleware(logstore);
const adapter = new BotFrameworkAdapter({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD,
  })
  .use(
    testRecorder,
    logger,
    autoSaveState,
    feedback,
  );
const port = process.env.PORT || 3978;
express()
  .post('/api/messages', (req, res, next) => adapter.processActivity(req, res, async (context: TurnContext) => {
    if (context.activity.type === ActivityTypes.Message) {
      if (context.activity.text.toLowerCase().startsWith('what')) {
        const results = await luis.recognize(context);
        console.log(results);
        await Feedback.sendFeedbackActivity(context, '42');
      } else {
        await context.sendActivity(`You said '${context.activity.text}'`);
      }
    }
  }).catch(next))
  .listen(port, () => console.log(`Listening on ${port}`));

// logstore.listTranscripts('emulator')
//   .then(console.log)
//   .catch(console.error);

// logstore.getTranscriptActivities('emulator', '862madb9633a')
//   .then(console.log)
//   .catch(console.error);

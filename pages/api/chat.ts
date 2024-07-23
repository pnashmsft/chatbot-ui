import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import AzureCredentialManager from '../api/AzureCredentialManager'; // Adjust the path based on your directory structure

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';

export const config = {
  runtime: 'edge',
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, temperature } = (await req.json()) as ChatBody;

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }
    console.log("!!!HEADERS!!!");
    console.log(req.headers);
    var principalName:string|null = req.headers.get("x-ms-client-principal-name");
    var bearer:string|null =req.headers.get("x-ms-token-aad-access-token")? req.headers.get("x-ms-token-aad-access-token") : req.headers.get("x-ms-client-principal");
    var bearerAuth: string|null = req.headers.get("x-ms-client-principal-id");
    console.log("principalName:" + principalName);
    console.log("bearer:" + bearer);
    encoding.free();


    if (typeof window === 'undefined')
    {
      console.log("I think I'm on the server");

      console.log("chat.ts about to get credential");
      const azureCredentialManager = await AzureCredentialManager.getInstance();
      const credtoken = azureCredentialManager.token; // Use the token
      console.log("chat.ts auth token:"+ credtoken);      
      // Get the access token
      //const token = await credential.getToken("https://cognitiveservices.azure.com/.default");
      //console.log("chat.ts auth token:"+token); 
    }

    const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend, principalName, bearer, bearerAuth );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;

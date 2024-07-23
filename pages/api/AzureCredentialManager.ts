import { AccessToken,DefaultAzureCredential, VisualStudioCodeCredential, AzureCliCredential, DefaultAzureCredentialOptions } from '@azure/identity';

class AzureCredentialManager {
  private static instance: AzureCredentialManager;
  public credential: DefaultAzureCredential;
  public token: AccessToken;

  private constructor() {
    console.log("starting AzureCredentialManager constructor");
    // Define options for DefaultAzureCredential

    this.credential = new DefaultAzureCredential();
    this.token = { token: "defaultTokenValue", expiresOnTimestamp: Date.now() + 1000 };
    console.log("finished AzureCredentialManager constructor");
  }

  public static async getInstance(): Promise<AzureCredentialManager> {
    if (!AzureCredentialManager.instance) {
      AzureCredentialManager.instance = new AzureCredentialManager();
      await AzureCredentialManager.instance.initializeToken();
    }
    return AzureCredentialManager.instance;
  }

  private async initializeToken() {
    console.log("starting AzureCredentialManager initializeToken");
    this.token = await this.credential.getToken("https://cognitiveservices.azure.com/.default");
    console.log("finished AzureCredentialManager initializeToken");
  }
}

export default AzureCredentialManager;
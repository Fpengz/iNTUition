import { themeManager } from '../content/ThemeManager';
import type { AuraTheme } from '../content/ThemeManager';

class ToolRouter {
  public execute(toolName: string, params: any) {
    console.log(`Aura Executing Tool: ${toolName}`, params);

    switch (toolName) {
      case 'IncreaseFontSize':
        this.handleIncreaseFontSize(params.scale);
        break;
      case 'SetTheme':
        this.handleSetTheme(params.theme);
        break;
      default:
        console.warn(`Unknown tool requested: ${toolName}`);
    }
  }

  private handleIncreaseFontSize(scale: number) {
    if (typeof scale !== 'number') return;
    document.documentElement.style.fontSize = `${scale}em`;
  }

  private handleSetTheme(theme: string) {
    themeManager.applyTheme(theme as AuraTheme);
  }
}

export const toolRouter = new ToolRouter();
export default toolRouter;

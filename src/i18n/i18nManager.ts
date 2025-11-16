import * as vscode from 'vscode';
import { LocaleStrings, SupportedLocale } from './locales';
import { en } from './en';
import { zhCN } from './zh-cn';

/**
 * Internationalization Manager
 * Manages locale detection and string retrieval based on VSCode's display language
 */
export class I18nManager {
    private static instance: I18nManager;
    private currentLocale: SupportedLocale;
    private strings: LocaleStrings;

    // Locale mappings
    private static readonly localeMap: Record<string, LocaleStrings> = {
        'en': en,
        'zh-cn': zhCN,
        'zh-tw': zhCN, // Use simplified Chinese for traditional Chinese (can be customized later)
        'ja': en, // Fallback to English for Japanese (can add Japanese translation later)
        'ko': en  // Fallback to English for Korean (can add Korean translation later)
    };

    private constructor() {
        this.currentLocale = this.detectLocale();
        this.strings = this.loadStrings(this.currentLocale);
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): I18nManager {
        if (!I18nManager.instance) {
            I18nManager.instance = new I18nManager();
        }
        return I18nManager.instance;
    }

    /**
     * Detect VSCode's display language
     */
    private detectLocale(): SupportedLocale {
        const vscodeLocale = vscode.env.language.toLowerCase();
        
        // Map VSCode locale to supported locale
        if (vscodeLocale.startsWith('zh-cn') || vscodeLocale === 'zh') {
            return 'zh-cn';
        } else if (vscodeLocale.startsWith('zh-tw') || vscodeLocale === 'zh-hant') {
            return 'zh-tw';
        } else if (vscodeLocale.startsWith('ja')) {
            return 'ja';
        } else if (vscodeLocale.startsWith('ko')) {
            return 'ko';
        } else {
            return 'en'; // Default to English
        }
    }

    /**
     * Load strings for the given locale
     */
    private loadStrings(locale: SupportedLocale): LocaleStrings {
        return I18nManager.localeMap[locale] || en;
    }

    /**
     * Get current locale
     */
    public getLocale(): SupportedLocale {
        return this.currentLocale;
    }

    /**
     * Get all strings for current locale
     */
    public getStrings(): LocaleStrings {
        return this.strings;
    }

    /**
     * Get a specific string by path (e.g., 'welcome.title')
     */
    public getString(path: string): string {
        const parts = path.split('.');
        let current: any = this.strings;

        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                console.warn(`i18n: String not found for path: ${path}`);
                return path; // Return the path itself as fallback
            }
        }

        return typeof current === 'string' ? current : path;
    }

    /**
     * Reload strings (useful if locale changes)
     */
    public reload(): void {
        this.currentLocale = this.detectLocale();
        this.strings = this.loadStrings(this.currentLocale);
    }

    /**
     * Format a string with placeholders
     * Example: format('Hello {0}, you have {1} messages', 'John', 5)
     * Returns: 'Hello John, you have 5 messages'
     */
    public format(template: string, ...args: any[]): string {
        return template.replace(/{(\d+)}/g, (match, index) => {
            const argIndex = parseInt(index, 10);
            return args[argIndex] !== undefined ? String(args[argIndex]) : match;
        });
    }

    /**
     * Get localized command title
     */
    public getCommandTitle(command: keyof LocaleStrings['commands']): string {
        return this.strings.commands[command];
    }

    /**
     * Get localized message
     */
    public getMessage(message: keyof LocaleStrings['messages']): string {
        return this.strings.messages[message];
    }

    /**
     * Get localized status bar text
     */
    public getStatusBarStage(stage: keyof LocaleStrings['statusBar']['stages']): string {
        return this.strings.statusBar.stages[stage];
    }

    /**
     * Get localized review type
     */
    public getReviewType(type: keyof LocaleStrings['review']['types']): string {
        return this.strings.review.types[type];
    }
}

// Export singleton instance
export const i18n = I18nManager.getInstance();


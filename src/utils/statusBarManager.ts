import * as vscode from 'vscode';
import { i18n } from '../i18n';

export type WritingStage = 'ideation' | 'writing' | 'review' | 'publish';

export class StatusBarManager implements vscode.Disposable {
    private statusBarItem: vscode.StatusBarItem;
    private currentStage: WritingStage = 'ideation';

    constructor() {
        this.statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            100
        );
        this.statusBarItem.show();
        this.updateStage('ideation');
    }

    updateStage(stage: WritingStage): void {
        this.currentStage = stage;

        const stageIcons: Record<WritingStage, string> = {
            ideation: '💡',
            writing: '✍️',
            review: '🔍',
            publish: '🚀'
        };

        const stageName = i18n.getStatusBarStage(stage);

        this.statusBarItem.text = `${stageIcons[stage]} ${stageName}`;
        this.statusBarItem.tooltip = `${i18n.getStrings().statusBar.writingStage}: ${stageName}`;
    }

    updateProgress(current: number, total: number): void {
        const percentage = Math.round((current / total) * 100);
        const writingText = i18n.getStatusBarStage('writing');
        this.statusBarItem.text = `$(pencil) ${writingText}: ${percentage}%`;
    }

    dispose(): void {
        this.statusBarItem.dispose();
    }
}

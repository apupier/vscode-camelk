import { assert } from 'chai';
import path = require('path');
import {
	ActivityBar,
	CustomTreeSection,
	DebugToolbar,
	EditorView,
	InputBox,
	SideBarView,
	TextEditor,
	ViewItem,
	VSBrowser,
	Workbench
} from 'vscode-extension-tester';
import { prepareEmptyTestFolder } from './utils/resourcesUtils';

const TEST_FOLDER = '../../../testFolder';
const WORKSPACE_FOLDER = path.join(__dirname, TEST_FOLDER);

const START_DEBUG_LABEL = 'Start Java debugger on Camel K integration';
const REMOVE_INTEGRATION_LABEL = 'Remove Apache Camel K Integration';


describe.only('Tooling for Apache Camel K extension', function () {

	before(async function () {
		this.timeout(200000);
		await prepareTempWorkspaceForTests(WORKSPACE_FOLDER);
		await VSBrowser.instance.driver.sleep(3000);
	});
	
	describe('Java Debug', function () {
		
		const INTEGRATION_LABEL = 'java-debug-test';
		const INTEGRATION_FILE = 'JavaDebugTest';

		before(async function (){
			this.timeout(20000);
			await createIntegration(INTEGRATION_FILE);
			await startIntegrationOnCurrentFile();
			await VSBrowser.instance.driver.sleep(5000);
		})

		it('Check Java Debug available', async function () {
			this.timeout(20000);

			const item = await findIntegrationOnSideBar(INTEGRATION_LABEL);
			const menu = await item.openContextMenu();

			assert.isTrue(await menu.hasItem(START_DEBUG_LABEL));
		});

		it.skip('Check Java Debug stops at breakpoint', async function() {
			//Currently failing because "No Java Debugger configured" error window
			//It won't work even if I install the extension using ExTester or manually on the VSCode Instance
			this.timeout(30000);
			await addBreakpointToFile();
			await startDebuggerOn(INTEGRATION_LABEL);
			await VSBrowser.instance.driver.sleep(3000);
			assert.isTrue(isThereSomethingInVariablesInDebugger());

			await stopAndExitDebug();
		})

		after(async function() {
			this.timeout(20000);
			await removeIntegration(INTEGRATION_LABEL);
			await prepareEmptyTestFolder(WORKSPACE_FOLDER);
		});

	});

	describe('No Java Debug on Invalid Files', function() {

		const INTEGRATION_LABEL = 'java-debug-test-invalid';
		const INTEGRATION_FILE = 'JavaDebugTestInvalid';

		before(async function (){
			this.timeout(20000);
			await createIntegration(INTEGRATION_FILE);
			await modifyCurrentFileToBeInvalid();
			await startIntegrationOnCurrentFile();
			await VSBrowser.instance.driver.sleep(3000);
		});

		it('Test Java Debugger Not Available On Invalid File', async function() {
			this.timeout(20000);
			const section = await getIntegrationSectionFromSideView(INTEGRATION_LABEL);
			const item = await section.findItem(INTEGRATION_LABEL) as ViewItem;
			const menu = await item.openContextMenu();

			assert.isFalse(await menu.hasItem(START_DEBUG_LABEL));
		});

		after(async function() {
			this.timeout(20000);
			await removeIntegration(INTEGRATION_LABEL);
			await prepareEmptyTestFolder(WORKSPACE_FOLDER);
		});
	})

});
async function startIntegrationOnCurrentFile() {
	const workbench = new Workbench();
	await workbench.executeCommand('Start Apache Camel K Integration');
	console.log('Start command');
	const startMode = await InputBox.create();
	await startMode.selectQuickPick('Basic');

	await VSBrowser.instance.driver.sleep(1000);
}

async function createIntegration(fileName: string) {
	const workbench = new Workbench();
	await workbench.executeCommand('Create a new Apache Camel K Integration file');
	const languageInput = await InputBox.create();
	await languageInput.selectQuickPick('Java');
	const WORKSPACE_FOLDERInput = await InputBox.create();
	await WORKSPACE_FOLDERInput.selectQuickPick(0);
	const nameInput = await InputBox.create();
	await nameInput.setText(fileName);
	await nameInput.confirm();

	const editorView = new EditorView();
	await VSBrowser.instance.driver.wait(async() => {
		try {
			return await editorView.openEditor(fileName + '.java') !== undefined;
		} catch {
			return false;
		}
	});
	console.log('integration created');
	return workbench;
}

async function modifyCurrentFileToBeInvalid() {
	const textEditor : TextEditor = new TextEditor();
	await textEditor.setTextAtLine(14, ";");
	await textEditor.save()
}

async function addBreakpointToFile() {
	const textEditor : TextEditor = new TextEditor();
	await textEditor.toggleBreakpoint(13);
	await textEditor.save();
}

async function removeIntegration(integrationLabel: string) {
	const section = await getIntegrationSectionFromSideView(integrationLabel);
	const item = await section.findItem(integrationLabel) as ViewItem;
	const menu = await item.openContextMenu();
	const removeItem = await menu.getItem(REMOVE_INTEGRATION_LABEL);
	await removeItem?.click();
}

async function prepareTempWorkspaceForTests(workspaceFolder: string) {
	await new EditorView().closeAllEditors();
	await prepareEmptyTestFolder(workspaceFolder);
	await VSBrowser.instance.openResources(workspaceFolder);
}

async function findIntegrationOnSideBar(integrationLabel: string) {
	const section = await getIntegrationSectionFromSideView(integrationLabel);
	return await section.findItem(integrationLabel) as ViewItem;
}

async function getIntegrationSectionFromSideView(integrationLabel: string) {
	const section = await new SideBarView().getContent().getSection('Apache Camel K Integrations') as CustomTreeSection;
	await section.expand();
	await VSBrowser.instance.driver.sleep(5000);
	return section;
}

async function stopAndExitDebug() {
	await stopDebugging();
	await getIntoExplorerView();
}

async function stopDebugging() {
	await (await DebugToolbar.create()).stop();
}

async function getIntoExplorerView() {
	const control = await new ActivityBar().getViewControl('Explorer');
	await control?.openView();
}

async function getContextMenuOf(integrationLabel: string) {
	const item = await findIntegrationOnSideBar(integrationLabel);
	return await item.openContextMenu()
}

async function startDebuggerOn(integrationLabel: string) {
	const menu = await getContextMenuOf(integrationLabel);

	await menu.getItem(START_DEBUG_LABEL).then(item => item?.click());
}

async function isThereSomethingInVariablesInDebugger() {
	const section = await new SideBarView().getContent().getSection('Variables') as CustomTreeSection;
	return await (await section.getVisibleItems()).length > 0;
}

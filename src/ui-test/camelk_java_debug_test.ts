import { assert } from 'chai';
import path = require('path');
import {
	CustomTreeSection,
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
		this.timeout(90000);
		await new EditorView().closeAllEditors();
		await prepareEmptyTestFolder(WORKSPACE_FOLDER);
		await VSBrowser.instance.openResources(WORKSPACE_FOLDER);
		// have a conditional wait for the extension to be activated
		await VSBrowser.instance.driver.sleep(3000);
	});
	
	
	describe('Java Debug', function () {
		
		const integrationLabel = 'java-debug-test';

		before(async function (){
			this.timeout(200000);
			await createIntegration('JavaDebugTest');
			await startIntegrationOnCurrentFile();
			await VSBrowser.instance.driver.sleep(5000);
		})

		it('Check Java Debug available', async function () {
			const section = await getIntegrationFromSideView(integrationLabel);
			const item = await section.findItem(integrationLabel) as ViewItem;
			const menu = await item.openContextMenu();

			assert.isTrue(await menu.hasItem(START_DEBUG_LABEL));
		});

		it('Check Java Debug stops at breakpoint', async function() {
			//open file
			//set breakpoint (how?)
			//Start debugger
			//Check it stops at line
			//?
		})

		after(async function() {
			await removeIntegration(integrationLabel);
			await prepareEmptyTestFolder(WORKSPACE_FOLDER);
		});

	});

	describe('No Java Debug on Invalid Files', function() {

		const integrationLabel = 'java-debug-test-invalid';

		before(async function (){
			this.timeout(200000);
			await createIntegration('JavaDebugTestInvalid');
			await modifyCurrentFileToBeInvalid();
			await startIntegrationOnCurrentFile();
			await VSBrowser.instance.driver.sleep(3000);
		});

		it('Test Java Debugger Not Available On Invalid File', async function() {
			const section = await getIntegrationFromSideView(integrationLabel);
			const item = await section.findItem(integrationLabel) as ViewItem;
			const menu = await item.openContextMenu();

			assert.isFalse(await menu.hasItem(START_DEBUG_LABEL));
		});

		after(async function() {
			await removeIntegration(integrationLabel);
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

async function getIntegrationFromSideView(integrationLabel: string) {
	// verify that started integration is properly running and visible inside Camel K integrations view
	const section = await new SideBarView().getContent().getSection('Apache Camel K Integrations') as CustomTreeSection;
	await section.expand();
	
	await VSBrowser.instance.driver.sleep(1000);

	const visibleItems = await section.getVisibleItems();
	let found = false;
	for (const visibleItem of visibleItems) {
		if (integrationLabel === await visibleItem.getText()) {
			found = true;
		}
	}
	assert.isTrue(found, `The integration with label ${integrationLabel} has not been found in visible items.`);
	console.log('integration started');
	return section;
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

async function removeIntegration(integrationLabel: string) {
	const section = await getIntegrationFromSideView(integrationLabel);
	const item = await section.findItem(integrationLabel) as ViewItem;
	const menu = await item.openContextMenu();
	const removeItem = await menu.getItem(REMOVE_INTEGRATION_LABEL);
	await removeItem?.click();
}

// async function removeFile(fileName: string) {
// 	const section = await new SideBarView().getContent().getSection('Explorer') as CustomTreeSection;
// 	const item = await section.findItem(fileName + ".java") as ViewItem;
// 	const menu = await item.openContextMenu();
// 	const removeItem = await menu.getItem('Delete');
// 	await removeItem?.click();
// 	await new ModalDialog().pushButton('Move to Trash');
// }
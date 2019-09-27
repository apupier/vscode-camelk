import * as path from 'path';
import * as fs from 'fs';
import mkdirp = require('mkdirp');
import {platform} from 'os';
import { Errorable } from './errorable';
import * as extension from './extension';
import * as config from './config';
import * as kamelCli from './kamel';
import * as kubectl from './kubectl';
import * as shell from './shell';
import * as vscode from 'vscode';

const download = require('download-tarball');

export const kamel = 'kamel';
export const kamel_windows = 'kamel.exe';

export function checkKamelCLIVersion() : Promise<string> {
	return new Promise<string>( async (resolve, reject) => {
        let kamelLocal = kamelCli.create();
        await kamelLocal.invoke('version')
            .then( (rtnValue) => {
                const strArray = rtnValue.split(' ');
                const version = strArray[strArray.length - 1].trim();
                console.log(`Apache Camel K CLI (kamel) version returned: ${version}`);
                resolve(version);
                return;
            }).catch ( (error) => {
                console.log(`Apache Camel K CLI (kamel) unavailable: ${error}`);
				reject(new Error(error));
				return;
        });
    });
}

export function checkKubectlCLIVersion() : Promise<string> {
	return new Promise<string>( async (resolve, reject) => {
        let kubectlLocal = kubectl.create();
        await kubectlLocal.invoke('version')
            .then( (rtnValue) => {
                const strArray = rtnValue.split(' ');
                strArray.forEach(element => {
                    if (element.toLowerCase().startsWith('gitversion')) {
                        const version = element.substring(element.indexOf('\"') + 1, element.lastIndexOf('\"'));
                        console.log(`Kubernetes CLI (kubectl) version returned: ${version}`);
                        resolve(version);
                        return;
                    }
                });
                reject (new Error('No kubectl version found'));
                return;
            }).catch ( (error) => {
                console.log(`Kubernetes CLI (kubectl)  unavailable: ${error}`);
				reject(new Error(error));
				return;
        });
    });
}

export async function installKamel(context: vscode.ExtensionContext): Promise<Errorable<null>> {
    const version = '1.0.0-M1'; //need to retrieve this if possible, but have a default
    await checkKamelCLIVersion().then((currentVersion) => {
        const currentVersionString = currentVersion as string;
        if (version.toLowerCase() === currentVersionString.toLowerCase()) {
            // no need to install, it's already here
            extension.shareMessageInMainOutputChannel(`Apache Camel K CLI version ${currentVersionString} available`);
            return { succeeded: true, result: null };
        }
    }).catch ( (error) => {
        console.error(error);
    });

    const os = platform();
    const isWindows = (os === 'win32');
    const binFile = (!isWindows) ? kamel : kamel_windows;

    const installFolder = getInstallFolder(kamel, context);
    console.log(`Downloading Apache Camel K CLI to ${installFolder}`);
    mkdirp.sync(installFolder);

    const kamelUrl = `https://github.com/apache/camel-k/releases/download/${version}/camel-k-client-${version}-${os}-64bit.tar.gz`;
    const downloadFile = path.join(installFolder, binFile);

    extension.shareMessageInMainOutputChannel(`Downloading kamel cli tool from ${kamelUrl} to ${downloadFile}`);

    grabTarGzAndUnGZ(kamelUrl, installFolder).then( (flag) => {
        console.log(`Downloaded ${downloadFile} successfully: ${flag}`);
        try {
            if (fs.existsSync(downloadFile)) {
                if (shell.isUnix()) {
                    fs.chmodSync(downloadFile, '0777');
                }
                config.addKamelPathToConfig(downloadFile);
            }
          } catch(err) {
            console.error(err);
            return { succeeded: false, error: [`Failed to download kamel: ${err}`] };
          }
    })
    .catch ( (error) => {
        console.log(error);
        return { succeeded: false, error: [`Failed to download kamel: ${error}`] };
    });
    return { succeeded: true, result: null };
}

function getInstallFolder(tool: string, context : vscode.ExtensionContext): string {
    return path.join(context.globalStoragePath, `camelk/tools/${tool}`);
}

async function grabTarGzAndUnGZ(fileUrl: string, directory: string) : Promise<boolean>{
	return new Promise<boolean>( (resolve, reject) => {
        download({
            url: fileUrl,
            dir: directory
          }).then(() => {
            resolve(true);
            return;
          }).catch( (err: any) => {
              reject(err);
              return;
          });
	});
}

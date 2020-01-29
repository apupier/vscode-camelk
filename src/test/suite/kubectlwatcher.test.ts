/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

import * as sinon from 'sinon';
import * as extension from '../../extension';

import waitUntil = require('async-wait-until');

suite("Kubectl integration watcher", function() {
    let sandbox: sinon.SinonSandbox;
    let startListeningForServerChanges: sinon.SinonSpy<[], Promise<void>>;

    this.beforeEach(() => {
        sandbox = sinon.createSandbox();
        startListeningForServerChanges = sinon.spy(extension, "startListeningForServerChanges");
        console.log('spy in places');
    });

    this.afterEach(() => {
        sandbox.restore();
    });

	test('Check there is no loop for closing kubectl process', async function() {
        await wait1Second();
        console.log('will do the check');
		sinon.assert.notCalled(startListeningForServerChanges);
	});

});

async function wait1Second() {
    let i = 0;
    let interval = 100;
    let waittime = 1000;
    await waitUntil(() => {
        console.log(i);
        i += interval;
        return i > (waittime - 3 * interval);
    }, waittime, interval);
}

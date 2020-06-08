const os = require('os');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const core = require('@actions/core');
const exec = require('@actions/exec');
const github = require('@actions/github');
const tr = require('@actions/exec/lib/toolrunner');
const cache = require('@actions/cache');

const paths = [path.join(os.homedir(), '.cache', 'pre-commit')];

async function getPythonVersion() {
    let myOutput = '';
    const options = {
        silent: true,
        listeners: {
            stdout: (data) => {
                myOutput += data.toString();
            }
        }
    };

    await exec.exec('python', ['-VV'], options);
    await exec.exec('which', ['python'], options);
    return myOutput;
}

function hashFile(filePath) {
    return hashString(fs.readFileSync(filePath).toString());

}

function hashString(content) {
    const sha256 = crypto.createHash('sha256');
    return sha256.update(content).digest('hex');
}

async function setupCache(cacheKey) {
    try {
        await cache.saveCache(paths, cacheKey);
    } catch (e) {
        if (e.toString().includes('reserveCache failed')) {
            // race condition
            core.info(e.message);
            return;
        }
        throw e;
    }
}

async function restoreCache(cacheKey) {
    return !!(await cache.restoreCache(paths, cacheKey));
}

function addToken(url, token) {
    return url.replace(/^https:\/\//, `https://x-access-token:${token}@`);
}

async function main() {
    await core.group('install pre-commit', async () => {
        await exec.exec('pip', ['install', 'pre-commit']);
        await exec.exec('pip', ['freeze', '--local']);
    });

    const args = [
        'run',
        '--show-diff-on-failure',
        '--color=always',
        ...tr.argStringToArray(core.getInput('extra_args')),
    ];
    const token = core.getInput('token');
    const pr = github.context.payload.pull_request;
    const push = !!token && !!pr;

    const pyVer = await getPythonVersion();
    const cacheKey = `pre-commit-1-${hashString(pyVer)}-${hashFile('.pre-commit-config.yaml')}`;
    await restoreCache(cacheKey);
    const ret = await exec.exec('pre-commit', args, {ignoreReturnCode: push});
    await setupCache(cacheKey);

    if (ret && push) {
        // actions do not run on pushes made by actions.
        // need to make absolute sure things are good before pushing
        // TODO: is there a better way around this limitation?
        await exec.exec('pre-commit', args);

        const diff = await exec.exec(
            'git', ['diff', '--quiet'], {ignoreReturnCode: true}
        );
        if (diff) {
            await core.group('push fixes', async () => {
                await exec.exec('git', ['config', 'user.name', 'pre-commit']);
                await exec.exec(
                    'git', ['config', 'user.email', 'pre-commit@example.com']
                );

                const branch = pr.head.ref;
                await exec.exec('git', ['checkout', 'HEAD', '-b', branch]);

                await exec.exec('git', ['commit', '-am', 'pre-commit fixes']);
                const url = addToken(pr.head.repo.clone_url, token);
                await exec.exec('git', ['remote', 'set-url', 'origin', url]);
                await exec.exec('git', ['push', 'origin', 'HEAD']);
            });
        }
    }
}

main().catch((e) => core.setFailed(e.message));

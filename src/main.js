import chalk from 'chalk';
import fs from 'fs';
import ncp from 'ncp';
import path from 'path';
import { promisify } from 'util';
import * as child from 'child_process';
import Listr from 'listr';
import { projectInstall } from 'pkg-install';

const access = promisify( fs.access );
const copy = promisify( ncp );

async function copyTemplateFiles ( options ) {
    return copy( options.templateDirectory, options.targetDirectory, {
        clobber: false,
    } );
}

function initGit ( options ) {

    const result =  child.spawn( 'git', [ 'init' ], {
        cwd: options.targetDirectory
    } )

    result.stderr.on('data', () => {
        return new Error( 'Failed to initialize git' );
    });
}

export async function createProject ( options ) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd()
    };

    const templateDir = path.resolve(
        new URL( import.meta.url ).pathname,
        '../../templates',
        options.template
    );
    options.templateDirectory = templateDir;

    try {
        await access( templateDir, fs.constants.R_OK );

        const tasks = new Listr( [
            {
                title: 'Copy project files',
                task: () => copyTemplateFiles( options ),
            },
            {
                title: 'Initialize git',
                task: () => initGit( options ),
                enabled: () => options.git,
            },
            {
                title: 'Install dependencies',
                task: () =>
                    projectInstall( {
                        cwd: options.targetDirectory,
                    } ),
                skip: () =>
                    !options.runInstall
                        ? 'Pass --install to automatically install dependencies'
                        : undefined,
            },
        ] );
    
        await tasks.run();
        console.log( '%s Project ready', chalk.green.bold( 'DONE' ) );
        return true;
    } catch ( err ) {
        console.error( '%s Invalid template name', chalk.red.bold( 'ERROR' ) );
        process.exit( 1 );
    }
}
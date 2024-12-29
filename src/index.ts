#!/usr/bin/env node

import { readFileSync } from 'fs';
import chalk from 'chalk';
import pacote from 'pacote';
import semver from 'semver';
import { table, TableUserConfig } from 'table';

interface PackageJson {
    overrides?: Record<string, string>;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
}

interface OutdatedPackage {
    package: string;
    current: string;
    wanted: string;
    latest: string;
    location: string;
}

const packageJson: PackageJson = JSON.parse(
    readFileSync('package.json', 'utf-8')
);

if (
    !packageJson.overrides &&
    !packageJson.dependencies &&
    !packageJson.devDependencies
) {
    console.log(chalk.yellow('Nothing to check in this package.json.'));
    process.exit(0);
}

const overrides: Record<string, string> = packageJson.overrides ?? {};
const dependencies: Record<string, string> = packageJson.dependencies ?? {};
const devDependencies: Record<string, string> =
    packageJson.devDependencies ?? {};
const outdated: OutdatedPackage[] = [];

const getWantedVersion = async (
    pkg: string,
    range: string
): Promise<string | null> => {
    try {
        const manifest = await pacote.packument(pkg);
        const versions = Object.keys(manifest.versions);
        return semver.maxSatisfying(versions, range);
    } catch (err) {
        if (err instanceof Error) {
            console.error(
                chalk.red(
                    `Failed to fetch wanted version for ${pkg}: ${err.message}`
                )
            );
        }
        return null;
    }
};

const checkOverrides = async (): Promise<void> => {
    for (const [pkg, version] of [
        ...Object.entries(overrides),
        ...Object.entries(dependencies),
        ...Object.entries(devDependencies)
    ]) {
        try {
            const manifest = await pacote.manifest(pkg);
            const latestVersion = manifest.version;

            const wantedVersion = await getWantedVersion(pkg, version);

            if (
                !semver.satisfies(latestVersion, version) ||
                !version.endsWith(latestVersion)
            ) {
                outdated.push({
                    package: pkg,
                    current: version,
                    wanted: wantedVersion ?? version,
                    latest: latestVersion,
                    location: `node_modules/${pkg}`
                });
            }
        } catch (err) {
            if (err instanceof Error) {
                console.error(
                    chalk.red(
                        `Failed to fetch version for ${pkg}: ${err.message}`
                    )
                );
            }
        }
    }

    if (outdated.length) {
        const tableData: string[][] = [
            [
                chalk.bold('Package'),
                chalk.bold('Current'),
                chalk.bold('Wanted'),
                chalk.bold('Latest'),
                chalk.bold('Location')
            ]
        ];

        outdated.forEach(
            ({ package: pkg, current, wanted, latest, location }) => {
                tableData.push([
                    chalk.blue(pkg),
                    chalk.green(current),
                    chalk.yellow(wanted ?? 'N/A'),
                    chalk.red(latest),
                    chalk.gray(location)
                ]);
            }
        );

        const tableConfig: TableUserConfig = {
            border: {
                topBody: chalk.gray('─'),
                topJoin: chalk.gray('┬'),
                topLeft: chalk.gray('┌'),
                topRight: chalk.gray('┐'),

                bottomBody: chalk.gray('─'),
                bottomJoin: chalk.gray('┴'),
                bottomLeft: chalk.gray('└'),
                bottomRight: chalk.gray('┘'),

                bodyLeft: chalk.gray('│'),
                bodyRight: chalk.gray('│'),
                bodyJoin: chalk.gray('│'),

                joinBody: chalk.gray('─'),
                joinLeft: chalk.gray('├'),
                joinRight: chalk.gray('┤'),
                joinJoin: chalk.gray('┼')
            }
        };

        console.log(table(tableData, tableConfig));
    } else {
        console.log(chalk.green('All packages are up to date.'));
    }
};

// noinspection JSIgnoredPromiseFromCall
checkOverrides();

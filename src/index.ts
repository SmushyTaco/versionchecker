#!/usr/bin/env node

import { readFileSync } from 'fs';
import pc from 'picocolors';
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
    console.log(pc.yellow('Nothing to check in this package.json.'));
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
                pc.red(
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
                    pc.red(`Failed to fetch version for ${pkg}: ${err.message}`)
                );
            }
        }
    }

    if (outdated.length) {
        const tableData: string[][] = [
            [
                pc.bold('Package'),
                pc.bold('Current'),
                pc.bold('Wanted'),
                pc.bold('Latest'),
                pc.bold('Location')
            ]
        ];

        outdated.forEach(
            ({ package: pkg, current, wanted, latest, location }) => {
                tableData.push([
                    pc.blue(pkg),
                    pc.green(current),
                    pc.yellow(wanted ?? 'N/A'),
                    pc.red(latest),
                    pc.gray(location)
                ]);
            }
        );

        const tableConfig: TableUserConfig = {
            border: {
                topBody: pc.gray('─'),
                topJoin: pc.gray('┬'),
                topLeft: pc.gray('┌'),
                topRight: pc.gray('┐'),

                bottomBody: pc.gray('─'),
                bottomJoin: pc.gray('┴'),
                bottomLeft: pc.gray('└'),
                bottomRight: pc.gray('┘'),

                bodyLeft: pc.gray('│'),
                bodyRight: pc.gray('│'),
                bodyJoin: pc.gray('│'),

                joinBody: pc.gray('─'),
                joinLeft: pc.gray('├'),
                joinRight: pc.gray('┤'),
                joinJoin: pc.gray('┼')
            }
        };

        console.log(table(tableData, tableConfig));
    } else {
        console.log(pc.green('All packages are up to date.'));
    }
};

// noinspection JSIgnoredPromiseFromCall
checkOverrides();

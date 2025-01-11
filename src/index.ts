#!/usr/bin/env node

import { readFileSync } from 'node:fs';
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
    readFileSync('package.json', 'utf8')
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
    package_: string,
    range: string
): Promise<string | undefined> => {
    try {
        const manifest = await pacote.packument(package_);
        const versions = Object.keys(manifest.versions);
        return semver.maxSatisfying(versions, range) ?? undefined;
    } catch (error) {
        if (error instanceof Error) {
            console.error(
                pc.red(
                    `Failed to fetch wanted version for ${package_}: ${error.message}`
                )
            );
        }
        return undefined;
    }
};

const checkOverrides = async (): Promise<void> => {
    for (const [package_, version] of [
        ...Object.entries(overrides),
        ...Object.entries(dependencies),
        ...Object.entries(devDependencies)
    ]) {
        try {
            const manifest = await pacote.manifest(package_);
            const latestVersion = manifest.version;

            const wantedVersion = await getWantedVersion(package_, version);

            if (
                !semver.satisfies(latestVersion, version) ||
                !version.endsWith(latestVersion)
            ) {
                outdated.push({
                    package: package_,
                    current: version,
                    wanted: wantedVersion ?? version,
                    latest: latestVersion,
                    location: `node_modules/${package_}`
                });
            }
        } catch (error) {
            if (error instanceof Error) {
                console.error(
                    pc.red(
                        `Failed to fetch version for ${package_}: ${error.message}`
                    )
                );
            }
        }
    }

    if (outdated.length > 0) {
        const tableData: string[][] = [
            [
                pc.bold('Package'),
                pc.bold('Current'),
                pc.bold('Wanted'),
                pc.bold('Latest'),
                pc.bold('Location')
            ]
        ];

        for (const {
            package: package_,
            current,
            wanted,
            latest,
            location
        } of outdated) {
            tableData.push([
                pc.blue(package_),
                pc.green(current),
                pc.yellow(wanted ?? 'N/A'),
                pc.red(latest),
                pc.gray(location)
            ]);
        }

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

await checkOverrides();

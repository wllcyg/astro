import type { RehypePlugin, RemarkPlugin, RemarkRehype } from '@astrojs/markdown-remark';
import type * as Postcss from 'postcss';
import type { ILanguageRegistration, IThemeRegistration, Theme } from 'shiki';
import type { AstroUserConfig, ViteUserConfig } from '../../@types/astro';

import { OutgoingHttpHeaders } from 'http';
import postcssrc from 'postcss-load-config';
import { BUNDLED_THEMES } from 'shiki';
import { fileURLToPath } from 'url';
import { z } from 'zod';
import { appendForwardSlash, prependForwardSlash, trimSlashes } from '../path.js';
import { isObject } from '../util.js';

const ASTRO_CONFIG_DEFAULTS: AstroUserConfig & any = {
	root: '.',
	srcDir: './src',
	publicDir: './public',
	outDir: './dist',
	base: '/',
	trailingSlash: 'ignore',
	build: {
		format: 'directory',
		client: './dist/client/',
		server: './dist/server/',
		serverEntry: 'entry.mjs',
	},
	server: {
		host: false,
		port: 3000,
		streaming: true,
	},
	style: { postcss: { options: {}, plugins: [] } },
	integrations: [],
	markdown: {
		drafts: false,
		syntaxHighlight: 'shiki',
		shikiConfig: {
			langs: [],
			theme: 'github-dark',
			wrap: false,
		},
		remarkPlugins: [],
		rehypePlugins: [],
		remarkRehype: {},
	},
	vite: {},
	legacy: {
		astroFlavoredMarkdown: false,
	},
	experimentalErrorOverlay: false,
};

export const AstroConfigSchema = z.object({
	root: z
		.string()
		.optional()
		.default(ASTRO_CONFIG_DEFAULTS.root)
		.transform((val) => new URL(val)),
	srcDir: z
		.string()
		.optional()
		.default(ASTRO_CONFIG_DEFAULTS.srcDir)
		.transform((val) => new URL(val)),
	publicDir: z
		.string()
		.optional()
		.default(ASTRO_CONFIG_DEFAULTS.publicDir)
		.transform((val) => new URL(val)),
	outDir: z
		.string()
		.optional()
		.default(ASTRO_CONFIG_DEFAULTS.outDir)
		.transform((val) => new URL(val)),
	site: z
		.string()
		.url()
		.optional()
		.transform((val) => (val ? appendForwardSlash(val) : val)),
	base: z.string().optional().default(ASTRO_CONFIG_DEFAULTS.base),
	trailingSlash: z
		.union([z.literal('always'), z.literal('never'), z.literal('ignore')])
		.optional()
		.default(ASTRO_CONFIG_DEFAULTS.trailingSlash),
	output: z
		.union([z.literal('static'), z.literal('server')])
		.optional()
		.default('static'),
	adapter: z.object({ name: z.string(), hooks: z.object({}).passthrough().default({}) }).optional(),
	integrations: z.preprocess(
		// preprocess
		(val) => (Array.isArray(val) ? val.flat(Infinity).filter(Boolean) : val),
		// validate
		z
			.array(z.object({ name: z.string(), hooks: z.object({}).passthrough().default({}) }))
			.default(ASTRO_CONFIG_DEFAULTS.integrations)
	),
	build: z
		.object({
			format: z
				.union([z.literal('file'), z.literal('directory')])
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.build.format),
			client: z
				.string()
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.build.client)
				.transform((val) => new URL(val)),
			server: z
				.string()
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.build.server)
				.transform((val) => new URL(val)),
			serverEntry: z.string().optional().default(ASTRO_CONFIG_DEFAULTS.build.serverEntry),
		})
		.optional()
		.default({}),
	server: z.preprocess(
		// preprocess
		// NOTE: Uses the "error" command here because this is overwritten by the
		// individualized schema parser with the correct command.
		(val) => (typeof val === 'function' ? val({ command: 'error' }) : val),
		// validate
		z
			.object({
				host: z
					.union([z.string(), z.boolean()])
					.optional()
					.default(ASTRO_CONFIG_DEFAULTS.server.host),
				port: z.number().optional().default(ASTRO_CONFIG_DEFAULTS.server.port),
				headers: z.custom<OutgoingHttpHeaders>().optional(),
			})
			.optional()
			.default({})
	),
	style: z
		.object({
			postcss: z
				.object({
					options: z.any(),
					plugins: z.array(z.any()),
				})
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.style.postcss),
		})
		.optional()
		.default({}),
	markdown: z
		.object({
			drafts: z.boolean().default(false),
			syntaxHighlight: z
				.union([z.literal('shiki'), z.literal('prism'), z.literal(false)])
				.default(ASTRO_CONFIG_DEFAULTS.markdown.syntaxHighlight),
			shikiConfig: z
				.object({
					langs: z.custom<ILanguageRegistration>().array().default([]),
					theme: z
						.enum(BUNDLED_THEMES as [Theme, ...Theme[]])
						.or(z.custom<IThemeRegistration>())
						.default(ASTRO_CONFIG_DEFAULTS.markdown.shikiConfig.theme),
					wrap: z.boolean().or(z.null()).default(ASTRO_CONFIG_DEFAULTS.markdown.shikiConfig.wrap),
				})
				.default({}),
			remarkPlugins: z
				.union([
					z.string(),
					z.tuple([z.string(), z.any()]),
					z.custom<RemarkPlugin>((data) => typeof data === 'function'),
					z.tuple([z.custom<RemarkPlugin>((data) => typeof data === 'function'), z.any()]),
				])
				.array()
				.default(ASTRO_CONFIG_DEFAULTS.markdown.remarkPlugins),
			rehypePlugins: z
				.union([
					z.string(),
					z.tuple([z.string(), z.any()]),
					z.custom<RehypePlugin>((data) => typeof data === 'function'),
					z.tuple([z.custom<RehypePlugin>((data) => typeof data === 'function'), z.any()]),
				])
				.array()
				.default(ASTRO_CONFIG_DEFAULTS.markdown.rehypePlugins),
			remarkRehype: z
				.custom<RemarkRehype>((data) => data instanceof Object && !Array.isArray(data))
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.markdown.remarkRehype),
			extendDefaultPlugins: z.boolean().default(false),
		})
		.default({}),
	vite: z
		.custom<ViteUserConfig>((data) => data instanceof Object && !Array.isArray(data))
		.default(ASTRO_CONFIG_DEFAULTS.vite),
	legacy: z
		.object({
			astroFlavoredMarkdown: z
				.boolean()
				.optional()
				.default(ASTRO_CONFIG_DEFAULTS.legacy.astroFlavoredMarkdown),
		})
		.optional()
		.default({}),
	experimentalErrorOverlay: z.boolean().optional().default(false),
});

interface PostCSSConfigResult {
	options: Postcss.ProcessOptions;
	plugins: Postcss.Plugin[];
}

async function resolvePostcssConfig(inlineOptions: any, root: URL): Promise<PostCSSConfigResult> {
	if (isObject(inlineOptions)) {
		const options = { ...inlineOptions };
		delete options.plugins;
		return {
			options,
			plugins: inlineOptions.plugins || [],
		};
	}
	const searchPath = typeof inlineOptions === 'string' ? inlineOptions : fileURLToPath(root);
	try {
		// @ts-ignore
		return await postcssrc({}, searchPath);
	} catch (err: any) {
		if (!/No PostCSS Config found/.test(err.message)) {
			throw err;
		}
		return {
			options: {},
			plugins: [],
		};
	}
}

export function createRelativeSchema(cmd: string, fileProtocolRoot: URL) {
	// We need to extend the global schema to add transforms that are relative to root.
	// This is type checked against the global schema to make sure we still match.
	const AstroConfigRelativeSchema = AstroConfigSchema.extend({
		root: z
			.string()
			.default(ASTRO_CONFIG_DEFAULTS.root)
			.transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
		srcDir: z
			.string()
			.default(ASTRO_CONFIG_DEFAULTS.srcDir)
			.transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
		publicDir: z
			.string()
			.default(ASTRO_CONFIG_DEFAULTS.publicDir)
			.transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
		outDir: z
			.string()
			.default(ASTRO_CONFIG_DEFAULTS.outDir)
			.transform((val) => new URL(appendForwardSlash(val), fileProtocolRoot)),
		build: z
			.object({
				format: z
					.union([z.literal('file'), z.literal('directory')])
					.optional()
					.default(ASTRO_CONFIG_DEFAULTS.build.format),
				client: z
					.string()
					.optional()
					.default(ASTRO_CONFIG_DEFAULTS.build.client)
					.transform((val) => new URL(val, fileProtocolRoot)),
				server: z
					.string()
					.optional()
					.default(ASTRO_CONFIG_DEFAULTS.build.server)
					.transform((val) => new URL(val, fileProtocolRoot)),
				serverEntry: z.string().optional().default(ASTRO_CONFIG_DEFAULTS.build.serverEntry),
			})
			.optional()
			.default({}),
		server: z.preprocess(
			// preprocess
			(val) => {
				if (typeof val === 'function') {
					const result = val({ command: cmd === 'dev' ? 'dev' : 'preview' });
					// @ts-expect-error revive attached prop added from CLI flags
					if (val.port) result.port = val.port;
					// @ts-expect-error revive attached prop added from CLI flags
					if (val.host) result.host = val.host;
					return result;
				} else {
					return val;
				}
			},
			// validate
			z
				.object({
					host: z
						.union([z.string(), z.boolean()])
						.optional()
						.default(ASTRO_CONFIG_DEFAULTS.server.host),
					port: z.number().optional().default(ASTRO_CONFIG_DEFAULTS.server.port),
					headers: z.custom<OutgoingHttpHeaders>().optional(),
					streaming: z.boolean().optional().default(true),
				})
				.optional()
				.default({})
		),
		style: z
			.object({
				postcss: z.preprocess(
					(val) => resolvePostcssConfig(val, fileProtocolRoot),
					z
						.object({
							options: z.any(),
							plugins: z.array(z.any()),
						})
						.optional()
						.default(ASTRO_CONFIG_DEFAULTS.style.postcss)
				),
			})
			.optional()
			.default({}),
	}).transform((config) => {
		// If the user changed outDir but not build.server, build.config, adjust so those
		// are relative to the outDir, as is the expected default.
		if (
			!config.build.server.toString().startsWith(config.outDir.toString()) &&
			config.build.server.toString().endsWith('dist/server/')
		) {
			config.build.server = new URL('./dist/server/', config.outDir);
		}
		if (
			!config.build.client.toString().startsWith(config.outDir.toString()) &&
			config.build.client.toString().endsWith('dist/client/')
		) {
			config.build.client = new URL('./dist/client/', config.outDir);
		}
		const trimmedBase = trimSlashes(config.base);

		// If there is no base but there is a base for site config, warn.
		const sitePathname = config.site && new URL(config.site).pathname;
		if (!trimmedBase.length && sitePathname && sitePathname !== '/') {
			config.base = sitePathname;
			/* eslint-disable no-console */
			console.warn(`The site configuration value includes a pathname of ${sitePathname} but there is no base configuration.
			
A future version of Astro will stop using the site pathname when producing <link> and <script> tags. Set your site's base with the base configuration.`);
		}

		if (trimmedBase.length && config.trailingSlash === 'never') {
			config.base = prependForwardSlash(trimmedBase);
		} else {
			config.base = prependForwardSlash(appendForwardSlash(trimmedBase));
		}

		return config;
	});

	return AstroConfigRelativeSchema;
}

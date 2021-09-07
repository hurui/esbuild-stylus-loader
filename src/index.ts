import * as path from 'path'
import {promises as fs, existsSync} from 'fs'
import {Plugin} from 'esbuild'
import stylusToCss from './stylus-to-css'
import {PluginOptions} from './types'

export function stylusLoader(pluginOptions: PluginOptions = {}): Plugin {
	return {
		name: 'stylus-loader',
		setup(build) {
			const {sourcemap} = build.initialOptions
			const includePaths =  pluginOptions?.stylusOptions?.include ?? []

			// intercept stylus files
			build.onResolve({filter: /\.(styl|stylus)$/}, args => {
				const oldPath = args.path
				let newPath = args.path
				for (const includePath of includePaths) {
					if (oldPath.startsWith(path.basename(includePath))) {
						const AssumeExistPath = path.resolve(includePath, '..', oldPath)
						if (existsSync(AssumeExistPath)) {
							newPath = AssumeExistPath
							break
						}
					}
				}
				return {
					path: path.resolve(
						process.cwd(),
						path.relative(process.cwd(), args.resolveDir),
						newPath,
					),
					namespace: 'stylus',
				}
			})

			// intercept non-stylus files
			build.onResolve({filter: /.*/}, args => {
				if (args.namespace !== 'stylus') {
					return
				}

				return {
					external: true,
				}
			})

			// handle stylus files
			build.onLoad({
				filter: /.*/,
				namespace: 'stylus',
			}, async args => {
				const content = await fs.readFile(args.path, 'utf8')
				const code = await stylusToCss(content, {
					...pluginOptions.stylusOptions,
					filePath: args.path,
					sourcemap: (
						sourcemap === true
						|| sourcemap === 'inline'
						|| sourcemap === 'external'
						|| sourcemap === 'both'
					),
				})

				return {
					contents: code,
					loader: 'css',
					resolveDir: path.dirname(args.path),
				}
			})
		},
	}
}

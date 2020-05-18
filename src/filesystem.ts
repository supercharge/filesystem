'use strict'

import Os from 'os'
import Path from 'path'
import { AppendOptions } from '../types'
import ReadRecursive from 'recursive-readdir'
import { tap, upon } from '@supercharge/goodies'
import { random as randomString, isDate } from './helper'
import Fs, { Stats, SymlinkType, CopyOptions } from 'fs-extra'
import Lockfile, { LockOptions, UnlockOptions, CheckOptions } from 'proper-lockfile'

export class Filesystem {
  /**
   * Retrieve information about the given file. Use `access`
   * to check whether the `file` exists instead of `stat`.
   *
   * @param {String} file
   *
   * @returns {Stats}
   */
  static async stat (file: string): Promise<Stats> {
    return Fs.stat(file)
  }

  /**
   * Returns the file size in bytes of the file located at `path`.
   *
   * @param {String} path
   *
   * @returns {Integer}
   */
  static async size (path: string): Promise<number> {
    return upon(this.stat(path), (stat: Stats) => {
      return stat.size
    })
  }

  /**
   * Retrieve the time when `file` was last modified.
   *
   * @param {String} file
   *
   * @returns {Date}
   */
  static async lastModified (file: string): Promise<Date> {
    return upon(this.stat(file), (stat: Stats) => {
      return stat.mtime
    })
  }

  /**
   * Retrieve the time when `file` was last accessed.
   *
   * @param {String} file
   *
   * @returns {Date}
   */
  static async lastAccessed (file: string): Promise<Date> {
    return upon(this.stat(file), (stat: Stats) => {
      return stat.atime
    })
  }

  /**
   * Change the file system timestamps of the
   * referenced `path`. Updates the last
   * accessed and last modified properties.
   *
   * @param {String} path
   * @param {Number} lastAccessed
   * @param {Number} lastModified
   *
   * @throws
   */
  static async updateTimestamps (path: string, lastAccessed: Date, lastModified: Date): Promise<void> {
    if (!isDate(lastAccessed)) {
      throw new Error(`Updating the last accessed timestamp for ${path} requires an instance of "Date". Received ${typeof lastAccessed}`)
    }

    if (!isDate(lastModified)) {
      throw new Error(`Updating the last modified timestamp for ${path} requires an instance of "Date". Received ${typeof lastAccessed}`)
    }

    return Fs.utimes(path, lastAccessed, lastModified)
  }

  /**
   * Test the user's permissions for the given `path` which can
   * be a file or directory. The `mode` argument is an optional
   * integer to specify the accessibility level.
   *
   * @param {String} path  - file or directory path
   * @param {Integer} mode - defaults to `fs.constants.F_OK`
   *
   * @returns {Boolean}
   *
   * @throws
   */
  static async canAccess (path: string, mode: number = Fs.constants.F_OK): Promise<boolean> {
    try {
      await Fs.access(path, mode)

      return true
    } catch (error) {
      return false
    }
  }

  /**
   * Determines whether the given `path` exists on the file system.
   *
   * @param {String} path
   *
   * @returns {Boolean}
   */
  static async pathExists (path: string): Promise<boolean> {
    return Fs.pathExists(path)
  }

  /**
   * Shortcut for `pathExists` to check whether a given file
   * or directory exists on the file system.
   *
   * @param {String} path
   *
   * @returns {Boolean}
   */
  static async exists (path: string): Promise<boolean> {
    return this.pathExists(path)
  }

  /**
   * Determines wether the given `path` does not exists.
   *
   * @param {String} path
   *
   * @returns {Boolean}
   */
  static async notExists (path: string): Promise<boolean> {
    return !await this.exists(path)
  }

  /**
   * Ensure that the `file` exists. If the requested file and
   * directories do not exist, they are created. If the file
   * already exists, it is NOT modified.
   *
   * @param {String} file
   */
  static async ensureFile (file: string): Promise<void> {
    return Fs.ensureFile(file)
  }

  /**
   * Read the entire content of `file`. If no `encoding` is
   * specified, the raw buffer is returned. If `encoding` is
   * an object, it allows the `encoding` and `flag` options.
   *
   * @param {String} file
   * @param {String|Object} encoding
   *
   * @returns {String}
   */
  static async readFile (file: string, encoding: string = 'utf8'): Promise<string> {
    return Fs.readFile(file, encoding)
  }

  /**
   * Read the contents of a directory with the given `path`.
   * Returns an array of the names of the files in the
   * directory excluding `.` and `..`.
   *
   * @param {String} path
   *
   * @returns {Array}
   */
  static async files (path: string): Promise<string[]> {
    return Fs.readdir(path)
  }

  /**
   * Read the contents of the directory at the given `path`
   * recursively. Returns an array of file names
   * excluding `.`, `..`, and dotfiles.
   *
   * @param {String} path
   * @param {Object} options config object -  supports the `ignore` property: list of ignored files
   *
   * @returns {Array}
   */
  static async allFiles (path: string, options: any = {}): Promise<string[]> {
    const { ignore } = options

    return ReadRecursive(
      path,
      ignore ? [].concat(ignore) : undefined
    )
  }

  /**
   * Write the given `content` to the file` and create
   * any parent directories if not existent.
   *
   * @param  {String} path
   * @param  {String} content
   * @param  {Object} options
   */
  static async writeFile (file: string, content: string, options: string|object = 'utf8'): Promise<void> {
    return Fs.outputFile(file, content, options)
  }

  /**
   * Removes a file or directory from the
   * file system located at `path`.
   *
   * @param {String} path
   */
  static async remove (path: string): Promise<void> {
    return Fs.remove(path)
  }

  /**
   * Removes a `file` from the file system.
   *
   * @param {String} file
   */
  static async removeFile (file: string): Promise<void> {
    return Fs.remove(file)
  }

  /**
   * Copy a file or directory from `src` to `dest`. The
   * directory can have contents. Like `cp -r`. If
   * `src` is a directory this method copies everything
   * inside of `src`, not the entire directory itself.
   *
   * If `src` is a file, make sure that `dest` is a file
   * as well (and not a directory).
   *
   * @param {String} src  - source path
   * @param {String} dest - destination path
   * @param {Object} options
   */
  static async copy (src: string, dest: string, options: CopyOptions): Promise<void> {
    return Fs.copy(src, dest, options)
  }

  /**
   * Moves a file or directory from `src` to `dest`. By default,
   * this method doesn't override existingfiles. You can
   * override existing files using `{ override: true }`.
   *
   * @param {String} src  - source path
   * @param {String} dest - destination path
   * @param {Object} options
   */
  static async move (src: string, dest: string, options: object = {}): Promise<void> {
    return Fs.move(src, dest, options)
  }

  /**
   * Ensures that the directory exists. If the directory
   * structure does not exist, it is created.
   * Like `mkdir -p`.
   *
   * @param {String} dir - directory path
   *
   * @returns {String} dir - directory path
   */
  static async ensureDir (dir: string): Promise<string> {
    return tap(dir, async () => {
      await Fs.ensureDir(dir)
    })
  }

  /**
   * Removes a `dir` from the file system.The directory
   * can have content. Content in the directory will
   * be removed as well, like `rm -rf`.
   *
   * @param {String} dir - directory path
   */
  static async removeDir (dir: string): Promise<void> {
    return Fs.remove(dir)
  }

  /**
   * Ensures that a directory is empty. Deletes directory
   * contents if the directory is not empty. If the
   * directory does not exist, it is created.
   * The directory itself is not deleted.
   *
   * @param {String} dir
   */
  static async emptyDir (dir: string): Promise<void> {
    return Fs.emptyDir(dir)
  }

  /**
   * Changes the permissions of a `file`.
   * The `mode` is a numeric bitmask and
   * can be an integer or string.
   *
   * @param {String} file
   * @param {String|Integer} mode
   */
  static async chmod (file: string, mode: string): Promise<void> {
    return Fs.chmod(file, parseInt(mode, 8))
  }

  /**
   * Ensures that the link from source to
   * destination exists. If the directory
   * structure does not exist, it is created.
   *
   * @param {String} src
   * @param {String} dest
   */
  static async ensureLink (src: string, dest: string): Promise<void> {
    return Fs.ensureLink(src, dest)
  }

  /**
   * Ensures that the symlink from source to
   * destination exists. If the directory
   * structure does not exist, it is created.
   *
   * @param {String} src
   * @param {String} dest
   * @param {String} type
   */
  static async ensureSymlink (src: string, dest: string, type: SymlinkType = 'file'): Promise<void> {
    return Fs.ensureSymlink(src, dest, type)
  }

  /**
   * Acquire a file lock on the specified `file` path with the given `options`.
   * If the `file` is already locked, this method won't throw an error and
   * instead just move on.
   *
   * @param {String} file
   * @param {Object} options
   *
   * @returns {Function} release function
   */
  static async lock (file: string, options?: LockOptions): Promise<void> {
    if (await this.isNotLocked(file, options)) {
      await Lockfile.lock(file, options)
    }
  }

  /**
   * Release an existent lock for the `file` and given `options`. If the `file`
   * isn't locked, this method won't throw an error and just move on.
   *
   * @param {String} file
   */
  static async unlock (file: string, options?: UnlockOptions): Promise<void> {
    if (await this.isLocked(file, options)) {
      await Lockfile.unlock(file, options)
    }
  }

  /**
   * Check if the `file` is locked and not stale.
   *
   * @param {String} file
   * @param {Object} options
   *
   * @returns {Boolean}
   */
  static async isLocked (file: string, options: CheckOptions = {}): Promise<boolean> {
    return Lockfile.check(file, options)
  }

  /**
   * Check if the `file` is not locked and not stale.
   *
   * @param {String} file
   * @param {Object} options
   *
   * @returns {Boolean}
   */
  static async isNotLocked (file: string, options: CheckOptions = {}): Promise<boolean> {
    return !await this.isLocked(file, options)
  }

  /**
   * Create a random temporary file path you can write to.
   * The operating system will clean up the temporary
   * files automatically, probably after some days.
   *
   * @param {Object} options
   *
   * @returns {String}
   */
  static async tempFile ({ extension = '', name = '' } = {}): Promise<string> {
    if (extension && name) {
      throw new Error('The `name` and `extension` options are mutually exclusive.')
    }

    if (name) {
      return Path.resolve(await this.tempDir(), name)
    }

    return `${await this.tempDir()}.${extension.replace(/^\./, '')}`
  }

  /**
   * Create a temporary directory path which will
   * be cleaned up by the operating system.
   *
   * @returns {String}
   */
  static async tempDir (): Promise<string> {
    return this.ensureDir(
      await this.tempPath()
    )
  }

  /**
   * Generates a random, temporary path on the filesystem.
   *
   * @returns {String}
   */
  static async tempPath (): Promise<string> {
    return Path.resolve(
      await Fs.realpath(Os.tmpdir()), randomString()
    )
  }

  /**
   * Returns the extension of `file`. For example,
   * returns `.html` for the HTML file located
   * at `/path/to/index.html`.
   *
   * @param {String} file
   *
   * @returns {String}
   */
  static async extension (file: string): Promise<string> {
    return Path.extname(file)
  }

  /**
   * Returns the trailing name component from a file path. For example,
   * returns `file.png` from the path `/home/user/file.png/`.
   *
   * @param {String} path
   * @param {String} extension
   *
   * @returns {String}
   */
  static async basename (path: string, extension: string): Promise<string> {
    return Path.basename(path, extension)
  }

  /**
   * Returns the file name without extension.
   *
   * @param {String} file
   *
   * @returns {String}
   */
  static async filename (file: string): Promise<string> {
    return Path.parse(file).name
  }

  /**
   * Returns the directory name of the given `path`.
   * For example, a file path of `foo/bar/baz/file.txt`
   * returns `foo/bar/baz`.
   *
   * @param {String} path
   *
   * @returns {String}
   */
  static async dirname (path: string): Promise<string> {
    return Path.dirname(path)
  }

  /**
   * Determines whether the given `path` is a file.
   *
   * @param {String} path
   *
   * @returns {Boolean}
   */
  static async isFile (path: string): Promise<boolean> {
    return upon(this.stat(path), (stats: Stats) => {
      return stats.isFile()
    })
  }

  /**
   * Determines whether the given `path` is a directory.
   *
   * @param {String} path
   *
   * @returns {Boolean}
   */
  static async isDirectory (path: string): Promise<boolean> {
    return upon(this.stat(path), (stats: Stats) => {
      return stats.isDirectory()
    })
  }

  /**
   * Append the given `content` to a `file`. This method
   * creates the `file` if it does not exist yet.
   *
   * @param {String|Buffer} file
   * @param {String|Buffer} content
   * @param {String|Object} options
   */
  static async append (file: string | Buffer | number, content: string | Buffer, options?: AppendOptions): Promise<void> {
    return Fs.appendFile(file, content, options)
  }

  /**
   * Rename a file located at `src` to the pathname defined by `dest`.
   * Both, `src` and `dest` must be file paths. If a file already
   * exists at the `dest` location, it will be overwritten.
   *
   * @param {String} src
   * @param {String} dest
   */
  static async rename (src: string, dest: string): Promise<void> {
    return Fs.rename(src, dest)
  }
}

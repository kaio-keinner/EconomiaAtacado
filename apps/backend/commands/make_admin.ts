import { BaseCommand, args } from '@adonisjs/core/ace'
import type { CommandOptions } from '@adonisjs/core/types/ace'

export default class MakeAdmin extends BaseCommand {
  static commandName = 'user:make-admin'
  static description = 'Promove um usuário para role admin pelo email'

  static options: CommandOptions = {
    startApp: true,
  }

  @args.string({ description: 'E-mail do usuário a ser promovido' })
  declare email: string

  async run() {
    const { default: User } = await import('#models/user')

    const user = await User.findBy('email', this.email)

    if (!user) {
      this.logger.error(`Usuário com email "${this.email}" não encontrado.`)
      return
    }

    if (user.role === 'admin') {
      this.logger.info(`Usuário "${this.email}" já é admin.`)
      return
    }

    user.role = 'admin'
    await user.save()

    this.logger.success(`Usuário "${this.email}" promovido a admin com sucesso!`)
  }
}

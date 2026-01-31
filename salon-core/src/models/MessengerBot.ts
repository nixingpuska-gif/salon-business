import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../config/database';

export enum MessengerType {
  TELEGRAM = 'telegram',
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  VK = 'vk',
  VIBER = 'viber',
  MAX = 'max',
}

interface MessengerBotAttributes {
  id: string;
  salonId: string;
  messengerType: MessengerType;
  credentials: {
    // Instagram
    pageAccessToken?: string;
    appSecret?: string;
    verifyToken?: string;

    // VK
    accessToken?: string;
    groupId?: string;
    secretKey?: string;
    confirmationToken?: string;

    // Viber
    authToken?: string;

    // MAX
    apiKey?: string;
    botToken?: string;
  };
  config: {
    botName?: string;
    webhookUrl?: string;
    autoReply?: boolean;
    autoReplyMessage?: string;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MessengerBotCreationAttributes
  extends Optional<MessengerBotAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

export class MessengerBot
  extends Model<MessengerBotAttributes, MessengerBotCreationAttributes>
  implements MessengerBotAttributes
{
  public id!: string;
  public salonId!: string;
  public messengerType!: MessengerType;
  public credentials!: MessengerBotAttributes['credentials'];
  public config!: MessengerBotAttributes['config'];
  public isActive!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

MessengerBot.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    salonId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'salon_id',
    },
    messengerType: {
      type: DataTypes.ENUM(...Object.values(MessengerType)),
      allowNull: false,
      field: 'messenger_type',
    },
    credentials: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    config: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'is_active',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'messenger_bots',
    timestamps: true,
    indexes: [
      {
        fields: ['salon_id'],
      },
      {
        fields: ['salon_id', 'messenger_type'],
        unique: true,
      },
    ],
  }
);

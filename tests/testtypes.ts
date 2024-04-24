import HalJsonVuex from "../src";
import ResourceInterface from "../src/interfaces/ResourceInterface";
import { createStore } from "vuex";
import axios from "axios";
import { State } from "../src/storeModule";
import CollectionInterface from "../src/interfaces/CollectionInterface";

export type ResourceType<T extends ResourceInterface<T>> = (
  uriOrEntity?: string | T,
) => T;

export type CollectionType<
  Item extends ResourceInterface<Item>,
  Self extends ResourceInterface<Self> = ResourceInterface<never>,
> = CollectionInterface<Item> & Self;

const store = createStore<Record<string, State>>({});

const halJsonVuex = HalJsonVuex(store, axios, {
  forceRequestedSelfLink: true,
});

interface UserEntity extends ResourceInterface<UserEntity> {
  id: string;
  displayName: string;

  profile: ResourceType<ProfileEntity>;
}

interface ProfileEntity extends ResourceInterface<ProfileEntity> {
  id: string;
  firstname: string;
  surname: string;
  nickname: string;
  legalName: string;

  email: string;

  language: string;

  user: ResourceType<UserEntity>;
}

interface CampEntity extends ResourceInterface<CampEntity> {
  id: string;
  name: string;
  title: string;
  motto: string;

  isPrototype: boolean;
  creator: ResourceType<UserEntity>;

  addressName: string | null;
  addressStreet: string | null;
  addressZipcode: string | null;
  addressCity: string | null;

  coachName: string | null;
  courseKind: string | null;
  courseNumber: string | null;
  organizer: string | null;
  kind: string | null;
  printYSLogoOnPicasso: boolean | null;
  trainingAdvisorName: string | null;

  activities: () => CollectionType<ActivityEntity>;
  periods: () => CollectionType<PeriodEntity>;
  categories: () => CollectionType<CategoryEntity>;
  profiles: () => CollectionType<ProfileEntity>;
  progressLabels: () => CollectionType<ActivityProgressLabelEntity>;
}

interface PeriodEntity extends ResourceInterface<PeriodEntity> {
  id: string;
  start: string;
  end: string;

  camp: ResourceType<CampEntity>;
}

interface ActivityEntity extends ResourceInterface<ActivityEntity> {
  id: string;
  title: string;
  location: string;

  camp: ResourceType<CampEntity>;
  category: ResourceType<CategoryEntity>;
  period: ResourceType<PeriodEntity>;
  scheduleEntries: () => CollectionType<ScheduleEntryEntity>;
  activityResponsibles: () => CollectionType<ActivityResponsibleEntity>;
  activityProgressLabel: () => ResourceType<ActivityProgressLabelEntity>;
}

interface ActivityProgressLabelEntity
  extends ResourceInterface<ActivityProgressLabelEntity> {
  id: string;
  title: string;
  position: number;
  camp: ResourceType<CampEntity>;
}

interface ActivityResponsibleEntity
  extends ResourceInterface<ActivityResponsibleEntity> {
  id: string;
  activity: ResourceType<ActivityEntity>;
  campCollaboration: ResourceType<CampCollaborationEntity>;
}

interface ScheduleEntryEntity extends ResourceInterface<ScheduleEntryEntity> {
  id: string;
  start: string;
  end: string;

  dayNumber: number;
  scheduleEntryNumber: number;
  number: string;

  left: number;
  width: number;

  period: ResourceType<PeriodEntity>;
  day: ResourceType<DayEntity>;
}

interface DayEntity extends ResourceInterface<DayEntity> {
  id: string;
  start: string;
  end: string;

  number: number;
  dayOffset: number;

  period: ResourceType<PeriodEntity>;
  scheduleEntries: () => CollectionType<ScheduleEntryEntity>;
  dayResponsibles: () => CollectionType<DayResponsibleEntity>;
}

interface DayResponsibleEntity extends ResourceInterface<DayResponsibleEntity> {
  id: string;
  day: ResourceType<DayEntity>;
  campCollaboration: () => ResourceType<CampCollaborationEntity>;
}

interface CategoryEntity extends ResourceInterface<CategoryEntity> {
  id: string;
  short: string;
  name: string;

  numberingStyle: "a" | "A" | "i" | "I" | "1";
  color: string;

  camp: ResourceType<CampEntity>;
  contentNodes: () => CollectionType<ContentNode>;
  rootContentNode: ResourceType<ContentNode>;
  preferredContentNodes: () => CollectionType<ContentNode>;
}

type ContentNode =
  | ColumnLayoutNodeEntity
  | MultiSelectNodeEntity
  | SingleTextNodeEntity
  | StoryboardNodeEntity;

interface ContentNodesBase<Data = unknown> {
  id: string;
  contentTypeName: string;
  instanceName: string | null;
  slot: string;
  position: number;
  data: Data;

  contentType: ResourceType<ContentTypeEntity>;

  children: () => CollectionType<ContentNode>;
  parent: ResourceType<ContentNode>;
  root: ResourceType<ContentNode>;
}

interface ColumnLayoutNodeData {
  columns: {
    slot: string;
    width: number;
  }[];
}

interface ColumnLayoutNodeEntity
  extends ContentNodesBase<ColumnLayoutNodeData>,
    ResourceInterface<ColumnLayoutNodeEntity> {}

interface MultiSelectNodeData {
  options: {
    [key: string]: {
      checked: boolean;
    };
  };
}

interface MultiSelectNodeEntity
  extends ContentNodesBase<MultiSelectNodeData>,
    ResourceInterface<MultiSelectNodeEntity> {}

interface SingleTextNodeData {
  html: string;
}

interface SingleTextNodeEntity
  extends ContentNodesBase<SingleTextNodeData>,
    ResourceInterface<SingleTextNodeEntity> {}

interface StoryboardNodeData {
  sections: {
    [key: string]: {
      column1: string;
      column2Html: string;
      column3: string;
      position: number;
    };
  };
}

interface StoryboardNodeEntity
  extends ContentNodesBase<StoryboardNodeData>,
    ResourceInterface<StoryboardNodeEntity> {}

interface MaterialNodeEntity
  extends ContentNodesBase<null>,
    ResourceInterface<MaterialNodeEntity> {
  materialItems: () => CollectionType<MaterialItemEntity>;
}

interface ContentTypeEntity extends ResourceInterface<ContentTypeEntity> {
  id: string;
  name: string;

  contentNodes: () => CollectionType<ContentNode>;
}

interface CampCollaborationEntity
  extends ResourceInterface<CampCollaborationEntity> {
  id: string;
  role: "member" | "manager" | "guest";
  status: "invited" | "established" | "inactive";
  camp: ResourceType<CampEntity>;

  inviteEmail: string | null;
  user: ResourceType<UserEntity> | null;
}

interface MaterialListEntity extends ResourceInterface<MaterialListEntity> {
  id: string;
  name: string;

  itemCount: number;
  camp: ResourceType<CampEntity>;
  campCollaboration: ResourceType<CampCollaborationEntity>;
}

interface MaterialItemBase {
  id: string;
  article: string;
  quantity: number;
  unit: string;
  materialList: ResourceType<MaterialListEntity>;
}

type MaterialItemEntity = MaterialItemNodeEntity | MaterialItemPeriodEntity;

interface MaterialItemNodeEntity
  extends MaterialItemBase,
    ResourceInterface<MaterialItemNodeEntity> {
  materialNode: ResourceType<MaterialNodeEntity>;
  period: null;
}

interface MaterialItemPeriodEntity
  extends MaterialItemBase,
    ResourceInterface<MaterialItemPeriodEntity> {
  materialNode: null;
  period: ResourceType<PeriodEntity>;
}

interface InvitationDTO extends ResourceInterface<InvitationDTO> {
  campId: string;
  campTitle: string;
  userDisplayName: string | null;
  userAlreadyInCamp: boolean | null;
}

interface InvitationDTOParams {
  action: "find" | "accept" | "reject";
  id: string;
}

type CampParam = { camp?: string | string[] };
type ActivityParam = { activity?: string | string[] };
type PeriodParam = { period?: string | string[] };
type ActivityResponsiblesParams = ActivityParam & {
  activity?: { camp: string | string[] };
};
type ActivityResponsibleParams = {
  activityResponsibles?: ActivityParam;
};
type CampPrototypeQueryParam = { isPrototype: boolean };
type ContentNodeParam = {
  contentType?: string | string[];
  root?: string | string[];
  period?: string;
};
type CategoryParam = { categories?: string | string[] };
type DayParam = { day?: string | string[] };
type DayResponsibleParams = DayParam & {
  day?: { period: string | string[] };
};
type MaterialListParam = { materialList?: string | string[] };
type MaterialNodeParam = { materialNode?: string | string[] };
type MaterialItemParams = MaterialListParam &
  MaterialNodeParam & { period?: string };
type ProfileParams = {
  user: { collaborations: { camp: string | string[] } };
};
type TimeParam = {
  before?: string;
  strictly_before?: string;
  after?: string;
  strictly_after?: string;
};
type ScheduleEntryParams = PeriodParam &
  ActivityParam & {
    start?: TimeParam;
    end?: TimeParam;
  };

type SingleResource<T extends ResourceInterface<T>> = (params: { id: string }) => T;
type QueryResources<T extends ResourceInterface<T>, Param = Record<string, any>> = (
  params?: Param,
) => CollectionType<T>;

interface RootEndpoint extends ResourceInterface<RootEndpoint> {
  activities: QueryResources<ActivityEntity, CampParam> &
    SingleResource<ActivityEntity>;

  activityProgressLabels: QueryResources<
    ActivityProgressLabelEntity,
    CampParam
  > &
    SingleResource<ActivityProgressLabelEntity>;

  activityResponsibles: QueryResources<
    ActivityResponsibleEntity,
    ActivityResponsiblesParams
  > &
    SingleResource<ActivityResponsibleEntity>;

  campCollaborations: QueryResources<
    CampCollaborationEntity,
    CampParam & ActivityResponsibleParams
  > &
    SingleResource<CampCollaborationEntity>;

  camps: QueryResources<CampEntity, CampPrototypeQueryParam> &
    SingleResource<CampEntity>;

  categories: QueryResources<CategoryEntity, CampParam> &
    SingleResource<CategoryEntity>;

  columnLayouts: QueryResources<ColumnLayoutNodeEntity, ContentNodeParam> &
    SingleResource<ColumnLayoutNodeEntity>;

  contentNodes: (params?: ContentNodeParam) => CollectionType<ContentNode>;

  contentTypes: ((
    params?: CategoryParam,
  ) => CollectionType<ContentTypeEntity>) &
    SingleResource<ContentTypeEntity>;

  days: (() => CollectionType<DayEntity>) | SingleResource<DayEntity>;

  dayResponsibles: QueryResources<DayResponsibleEntity, DayResponsibleParams> &
    SingleResource<DayResponsibleEntity>;

  invitations: (params: InvitationDTOParams) => InvitationDTO;

  login: () => ResourceInterface<never>;

  materialItems: QueryResources<MaterialItemEntity, MaterialItemParams> &
    SingleResource<MaterialItemEntity>;

  materialLists: QueryResources<MaterialListEntity, CampParam> &
    SingleResource<MaterialListEntity>;

  materialNodes: QueryResources<MaterialNodeEntity, ContentNodeParam> &
    SingleResource<MaterialNodeEntity>;

  multiSelects: QueryResources<MultiSelectNodeEntity, ContentNodeParam> &
    SingleResource<MultiSelectNodeEntity>;

  oauthCevidb: () => ResourceInterface<never>;

  oauthGoogle: () => ResourceInterface<never>;

  oauthJubladb: () => ResourceInterface<never>;

  oauthPbsmidata: () => ResourceInterface<never>;

  periods: QueryResources<PeriodEntity, CampParam> &
    SingleResource<PeriodEntity>;

  profiles: QueryResources<ProfileEntity, ProfileParams> &
    SingleResource<ProfileEntity>;

  resetPassword: () => ResourceInterface<never>;

  scheduleEntries: QueryResources<ScheduleEntryEntity, ScheduleEntryParams> &
    SingleResource<ScheduleEntryEntity>;

  singleTexts: QueryResources<SingleTextNodeEntity, ContentNodeParam> &
    SingleResource<SingleTextNodeEntity>;

  storyboards: QueryResources<StoryboardNodeEntity, ContentNodeParam> &
    SingleResource<StoryboardNodeEntity>;

  users: (() => CollectionType<UserEntity>) & SingleResource<UserEntity>;
}

const root = halJsonVuex.get<RootEndpoint>();

root.camps({ isPrototype: false})._meta.load.then(endpoint => {
  const ugus = endpoint.items[0].$reload().then(camp => {
    camp.name
  })
})

root.camps().items[0].name = "";

//root.camps({ isPrototype: true }).sds[0].name = "";
root.camps({ isPrototype: true }).items[0].name = "";

root.camps({ isPrototype: true }).items[0].name = "";

const gugus = root.invitations({ action: "find", id: "123" });
gugus.campTitle = "";

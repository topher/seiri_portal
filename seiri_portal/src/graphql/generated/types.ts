import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { GraphQLContext } from '../resolvers/index';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  DateTime: { input: Date; output: Date; }
  JSON: { input: any; output: any; }
};

export type AcceptanceCriterion = {
  __typename?: 'AcceptanceCriterion';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  status: AcceptanceCriterionStatus;
  task: Task;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type AcceptanceCriterionStatus =
  | 'FAILED'
  | 'PENDING'
  | 'SATISFIED';

export type Initiative = {
  __typename?: 'Initiative';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  priority: Priority;
  status: InitiativeStatus;
  suite?: Maybe<Suite>;
  tasks: Array<Task>;
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
};

export type InitiativeStatus =
  | 'CANCELLED'
  | 'COMPLETED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'PLANNING';

export type Mutation = {
  __typename?: 'Mutation';
  _placeholder?: Maybe<Scalars['String']['output']>;
};

export type Priority =
  | 'HIGH'
  | 'LOW'
  | 'MEDIUM'
  | 'URGENT';

export type Query = {
  __typename?: 'Query';
  acceptanceCriterion?: Maybe<AcceptanceCriterion>;
  initiative?: Maybe<Initiative>;
  me?: Maybe<User>;
  suite?: Maybe<Suite>;
  task?: Maybe<Task>;
  workspace?: Maybe<Workspace>;
  workspaces: Array<Workspace>;
};


export type QueryAcceptanceCriterionArgs = {
  id: Scalars['ID']['input'];
};


export type QueryInitiativeArgs = {
  id: Scalars['ID']['input'];
};


export type QuerySuiteArgs = {
  id: Scalars['ID']['input'];
};


export type QueryTaskArgs = {
  id: Scalars['ID']['input'];
};


export type QueryWorkspaceArgs = {
  id: Scalars['ID']['input'];
};

export type Subscription = {
  __typename?: 'Subscription';
  _placeholder?: Maybe<Scalars['String']['output']>;
};

export type Suite = {
  __typename?: 'Suite';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  initiatives: Array<Initiative>;
  name: Scalars['String']['output'];
  type: SuiteType;
  updatedAt: Scalars['DateTime']['output'];
  workspace: Workspace;
};

export type SuiteType =
  | 'CUSTOM'
  | 'DESIGN'
  | 'ENGINEERING'
  | 'MARKETING'
  | 'OPERATIONS'
  | 'SALES';

export type Task = {
  __typename?: 'Task';
  acceptanceCriteria: Array<AcceptanceCriterion>;
  assignee?: Maybe<User>;
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  dueDate?: Maybe<Scalars['DateTime']['output']>;
  id: Scalars['ID']['output'];
  initiative: Initiative;
  priority: Priority;
  status: TaskStatus;
  title: Scalars['String']['output'];
  updatedAt: Scalars['DateTime']['output'];
};

export type TaskStatus =
  | 'BACKLOG'
  | 'CANCELLED'
  | 'DONE'
  | 'IN_PROGRESS'
  | 'IN_REVIEW'
  | 'TODO';

export type User = {
  __typename?: 'User';
  email: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name?: Maybe<Scalars['String']['output']>;
  workspaces: Array<Workspace>;
};

export type Workspace = {
  __typename?: 'Workspace';
  createdAt: Scalars['DateTime']['output'];
  description?: Maybe<Scalars['String']['output']>;
  id: Scalars['ID']['output'];
  initiatives: Array<Initiative>;
  members: Array<WorkspaceMember>;
  name: Scalars['String']['output'];
  suites: Array<Suite>;
  updatedAt: Scalars['DateTime']['output'];
};

export type WorkspaceMember = {
  __typename?: 'WorkspaceMember';
  id: Scalars['ID']['output'];
  joinedAt: Scalars['DateTime']['output'];
  role: WorkspaceRole;
  user: User;
  workspace: Workspace;
};

export type WorkspaceRole =
  | 'ADMIN'
  | 'MEMBER'
  | 'OWNER'
  | 'VIEWER';

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  AcceptanceCriterion: ResolverTypeWrapper<any>;
  AcceptanceCriterionStatus: AcceptanceCriterionStatus;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Initiative: ResolverTypeWrapper<any>;
  InitiativeStatus: InitiativeStatus;
  JSON: ResolverTypeWrapper<Scalars['JSON']['output']>;
  Mutation: ResolverTypeWrapper<{}>;
  Priority: Priority;
  Query: ResolverTypeWrapper<{}>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  Subscription: ResolverTypeWrapper<{}>;
  Suite: ResolverTypeWrapper<any>;
  SuiteType: SuiteType;
  Task: ResolverTypeWrapper<any>;
  TaskStatus: TaskStatus;
  User: ResolverTypeWrapper<any>;
  Workspace: ResolverTypeWrapper<any>;
  WorkspaceMember: ResolverTypeWrapper<any>;
  WorkspaceRole: WorkspaceRole;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  AcceptanceCriterion: any;
  Boolean: Scalars['Boolean']['output'];
  DateTime: Scalars['DateTime']['output'];
  ID: Scalars['ID']['output'];
  Initiative: any;
  JSON: Scalars['JSON']['output'];
  Mutation: {};
  Query: {};
  String: Scalars['String']['output'];
  Subscription: {};
  Suite: any;
  Task: any;
  User: any;
  Workspace: any;
  WorkspaceMember: any;
}>;

export type AiEnhancedDirectiveArgs = {
  agent: Scalars['String']['input'];
};

export type AiEnhancedDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = AiEnhancedDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AutomatableDirectiveArgs = { };

export type AutomatableDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = AutomatableDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type SuggestibleDirectiveArgs = { };

export type SuggestibleDirectiveResolver<Result, Parent, ContextType = GraphQLContext, Args = SuggestibleDirectiveArgs> = DirectiveResolverFn<Result, Parent, ContextType, Args>;

export type AcceptanceCriterionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['AcceptanceCriterion'] = ResolversParentTypes['AcceptanceCriterion']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['AcceptanceCriterionStatus'], ParentType, ContextType>;
  task?: Resolver<ResolversTypes['Task'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type InitiativeResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Initiative'] = ResolversParentTypes['Initiative']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Priority'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['InitiativeStatus'], ParentType, ContextType>;
  suite?: Resolver<Maybe<ResolversTypes['Suite']>, ParentType, ContextType>;
  tasks?: Resolver<Array<ResolversTypes['Task']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface JsonScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['JSON'], any> {
  name: 'JSON';
}

export type MutationResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  _placeholder?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  acceptanceCriterion?: Resolver<Maybe<ResolversTypes['AcceptanceCriterion']>, ParentType, ContextType, RequireFields<QueryAcceptanceCriterionArgs, 'id'>>;
  initiative?: Resolver<Maybe<ResolversTypes['Initiative']>, ParentType, ContextType, RequireFields<QueryInitiativeArgs, 'id'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  suite?: Resolver<Maybe<ResolversTypes['Suite']>, ParentType, ContextType, RequireFields<QuerySuiteArgs, 'id'>>;
  task?: Resolver<Maybe<ResolversTypes['Task']>, ParentType, ContextType, RequireFields<QueryTaskArgs, 'id'>>;
  workspace?: Resolver<Maybe<ResolversTypes['Workspace']>, ParentType, ContextType, RequireFields<QueryWorkspaceArgs, 'id'>>;
  workspaces?: Resolver<Array<ResolversTypes['Workspace']>, ParentType, ContextType>;
}>;

export type SubscriptionResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Subscription'] = ResolversParentTypes['Subscription']> = ResolversObject<{
  _placeholder?: SubscriptionResolver<Maybe<ResolversTypes['String']>, "_placeholder", ParentType, ContextType>;
}>;

export type SuiteResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Suite'] = ResolversParentTypes['Suite']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  initiatives?: Resolver<Array<ResolversTypes['Initiative']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<ResolversTypes['SuiteType'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  workspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TaskResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Task'] = ResolversParentTypes['Task']> = ResolversObject<{
  acceptanceCriteria?: Resolver<Array<ResolversTypes['AcceptanceCriterion']>, ParentType, ContextType>;
  assignee?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  dueDate?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  initiative?: Resolver<ResolversTypes['Initiative'], ParentType, ContextType>;
  priority?: Resolver<ResolversTypes['Priority'], ParentType, ContextType>;
  status?: Resolver<ResolversTypes['TaskStatus'], ParentType, ContextType>;
  title?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  email?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  workspaces?: Resolver<Array<ResolversTypes['Workspace']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WorkspaceResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['Workspace'] = ResolversParentTypes['Workspace']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  description?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  initiatives?: Resolver<Array<ResolversTypes['Initiative']>, ParentType, ContextType>;
  members?: Resolver<Array<ResolversTypes['WorkspaceMember']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  suites?: Resolver<Array<ResolversTypes['Suite']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type WorkspaceMemberResolvers<ContextType = GraphQLContext, ParentType extends ResolversParentTypes['WorkspaceMember'] = ResolversParentTypes['WorkspaceMember']> = ResolversObject<{
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  joinedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  role?: Resolver<ResolversTypes['WorkspaceRole'], ParentType, ContextType>;
  user?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  workspace?: Resolver<ResolversTypes['Workspace'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = GraphQLContext> = ResolversObject<{
  AcceptanceCriterion?: AcceptanceCriterionResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Initiative?: InitiativeResolvers<ContextType>;
  JSON?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Subscription?: SubscriptionResolvers<ContextType>;
  Suite?: SuiteResolvers<ContextType>;
  Task?: TaskResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  Workspace?: WorkspaceResolvers<ContextType>;
  WorkspaceMember?: WorkspaceMemberResolvers<ContextType>;
}>;

export type DirectiveResolvers<ContextType = GraphQLContext> = ResolversObject<{
  aiEnhanced?: AiEnhancedDirectiveResolver<any, any, ContextType>;
  automatable?: AutomatableDirectiveResolver<any, any, ContextType>;
  suggestible?: SuggestibleDirectiveResolver<any, any, ContextType>;
}>;

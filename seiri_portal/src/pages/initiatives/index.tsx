// Initiatives Page
// Main page for managing initiatives with comprehensive creation form

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { CreateInitiativeModal } from '@/components/initiatives/CreateInitiativeModal';
import { Plus, Search, Target, Users, DollarSign, Calendar, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Initiative {
  id: string;
  name: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  estimatedValue: string;
  expectedROI: number;
  createdAt: Date;
  workspaceId: string;
  initiativeType: 'PRD' | 'BUSINESS_MODEL' | 'CUSTOM';
  businessObjectives: string[];
  stakeholders: string[];
}

// Mock data for demonstration
const mockInitiatives: Initiative[] = [
  {
    id: 'init_1',
    name: 'PRD Development: Smart Analytics Platform',
    description: 'Comprehensive PRD for new analytics platform',
    priority: 'HIGH',
    status: 'ACTIVE',
    estimatedValue: '$2M revenue in first year',
    expectedROI: 25,
    createdAt: new Date('2024-01-15'),
    workspaceId: 'workspace_123',
    initiativeType: 'PRD',
    businessObjectives: ['Define clear product requirements', 'Establish user personas'],
    stakeholders: ['john@company.com', 'sarah@company.com']
  },
  {
    id: 'init_2',
    name: 'Business Model Development: E-commerce Platform',
    description: 'Comprehensive business model canvas development',
    priority: 'MEDIUM',
    status: 'ACTIVE',
    estimatedValue: '$5M revenue potential',
    expectedROI: 30,
    createdAt: new Date('2024-01-10'),
    workspaceId: 'workspace_123',
    initiativeType: 'BUSINESS_MODEL',
    businessObjectives: ['Define value proposition', 'Identify customer segments'],
    stakeholders: ['mike@company.com', 'lisa@company.com']
  }
];

export const InitiativesPage: React.FC = () => {
  const [initiatives, setInitiatives] = useState<Initiative[]>(mockInitiatives);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterType, setFilterType] = useState<string>('ALL');

  // Get current workspace ID - in real app this would come from context/routing
  const workspaceId = 'workspace_123';

  const filteredInitiatives = initiatives.filter(initiative => {
    const matchesSearch = initiative.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         initiative.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = filterPriority === 'ALL' || initiative.priority === filterPriority;
    const matchesStatus = filterStatus === 'ALL' || initiative.status === filterStatus;
    const matchesType = filterType === 'ALL' || initiative.initiativeType === filterType;

    return matchesSearch && matchesPriority && matchesStatus && matchesType;
  });

  const handleCreateSuccess = (newInitiative: Initiative) => {
    setInitiatives(prev => [newInitiative, ...prev]);
    console.log('Initiative created successfully:', newInitiative);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-blue-500';
      case 'PAUSED': return 'bg-yellow-500';
      case 'COMPLETED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PRD': return <Target className="h-4 w-4" />;
      case 'BUSINESS_MODEL': return <DollarSign className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Initiatives</h1>
          <p className="text-muted-foreground">
            Manage and track your workspace initiatives with comprehensive value tracking
          </p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Create Initiative
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search initiatives..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="PRD">PRD Development</SelectItem>
                <SelectItem value="BUSINESS_MODEL">Business Model</SelectItem>
                <SelectItem value="CUSTOM">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Initiative Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Initiatives</p>
                <p className="text-2xl font-bold">{initiatives.length}</p>
              </div>
              <Target className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active</p>
                <p className="text-2xl font-bold">
                  {initiatives.filter(i => i.status === 'ACTIVE').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold">
                  {initiatives.filter(i => i.priority === 'HIGH' || i.priority === 'URGENT').length}
                </p>
              </div>
              <div className="h-8 w-8 rounded-full bg-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. ROI</p>
                <p className="text-2xl font-bold">
                  {Math.round(initiatives.reduce((sum, i) => sum + i.expectedROI, 0) / initiatives.length)}%
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Initiatives List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Initiatives ({filteredInitiatives.length})
        </h2>
        
        {filteredInitiatives.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No initiatives found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterPriority !== 'ALL' || filterStatus !== 'ALL' || filterType !== 'ALL'
                  ? 'Try adjusting your filters or search terms.'
                  : 'Get started by creating your first initiative.'}
              </p>
              {!searchTerm && filterPriority === 'ALL' && filterStatus === 'ALL' && filterType === 'ALL' && (
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Initiative
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredInitiatives.map((initiative) => (
              <Card key={initiative.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(initiative.initiativeType)}
                      <CardTitle className="line-clamp-1">{initiative.name}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={`${getPriorityColor(initiative.priority)} text-white`}>
                        {initiative.priority}
                      </Badge>
                      <Badge variant="outline" className={`${getStatusColor(initiative.status)} text-white`}>
                        {initiative.status}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {initiative.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Value Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Estimated Value</p>
                        <p className="text-sm">{initiative.estimatedValue}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Expected ROI</p>
                        <p className="text-sm font-semibold text-green-600">{initiative.expectedROI}%</p>
                      </div>
                    </div>

                    {/* Business Objectives */}
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Business Objectives</p>
                      <div className="space-y-1">
                        {initiative.businessObjectives.slice(0, 2).map((objective, index) => (
                          <p key={index} className="text-sm text-muted-foreground line-clamp-1">
                            • {objective}
                          </p>
                        ))}
                        {initiative.businessObjectives.length > 2 && (
                          <p className="text-sm text-muted-foreground">
                            +{initiative.businessObjectives.length - 2} more objectives
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {initiative.stakeholders.length} stakeholder{initiative.stakeholders.length !== 1 ? 's' : ''}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {initiative.createdAt.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Initiative Modal */}
      <CreateInitiativeModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        workspaceId={workspaceId}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
};